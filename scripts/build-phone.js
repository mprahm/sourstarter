// Local release build: bumps the patch version in app.json, builds the APK and
// installs it on the connected phone as an update, so breads are kept.
// Run with `npm.cmd run build:phone`, then commit the new version.
// Add `-- --prebuild` to regenerate android/ when the script can't tell it's
// needed, for example after changing the app icon.
const { execSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const android = path.join(root, 'android');
const stampPath = path.join(android, '.prebuild-stamp');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });

const configPath = path.join(root, 'app.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const [major, minor, patch] = config.expo.version.split('.').map(Number);
config.expo.version = [major, minor, patch + 1].join('.');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log('Version ' + config.expo.version);

// What android/ is generated from. The version is left out: it's written below,
// because regenerating deletes the compiled native code and takes 16 minutes.
const hash = crypto.createHash('sha256');
hash.update(JSON.stringify({ ...config.expo, version: undefined }));
hash.update(fs.readFileSync(path.join(root, 'package-lock.json')));
for (const file of fs.readdirSync(path.join(root, 'plugins')).sort()) {
  hash.update(fs.readFileSync(path.join(root, 'plugins', file)));
}
const stamp = hash.digest('hex');

const stale = !fs.existsSync(stampPath) || fs.readFileSync(stampPath, 'utf8') !== stamp;
if (stale || process.argv.includes('--prebuild')) {
  run('npx expo prebuild --platform android --no-install');
  fs.writeFileSync(stampPath, stamp);
} else {
  const gradlePath = path.join(android, 'app', 'build.gradle');
  const gradle = fs.readFileSync(gradlePath, 'utf8');
  fs.writeFileSync(gradlePath, gradle.replace(/versionName ".*"/, 'versionName "' + config.expo.version + '"'));
}

// The CMake bundled by default can't handle Windows' long paths. See docs/BUILDING.md.
const cmake = path.join(process.env.ANDROID_HOME ?? '', 'cmake', '3.31.6');
if (process.platform === 'win32' && fs.existsSync(cmake)) {
  const escaped = cmake.replace(/\\/g, '\\\\').replace(':', '\\:');
  fs.writeFileSync(path.join(android, 'local.properties'), 'cmake.dir=' + escaped + '\n');
}

// arm64 only: that's the phone, and the other three processor types take longer to build.
const gradlew = path.join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
run('"' + gradlew + '" app:assembleRelease -x lint -x test --configure-on-demand --build-cache -PreactNativeArchitectures=arm64-v8a', android);

const apk = path.join(android, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
try {
  run('"' + path.join(process.env.ANDROID_HOME ?? '', 'platform-tools', 'adb') + '" install -r "' + apk + '"');
} catch {
  console.log('Built, but not installed. Check that the phone shows up in `adb devices`. APK: ' + apk);
  process.exit(1);
}
