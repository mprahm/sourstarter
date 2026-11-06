// Local release build: bumps the patch version in app.json, builds the APK and
// installs it on the connected phone as an update, so breads are kept.
// Run with `npm.cmd run build:phone`, then commit the new version.
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const android = path.join(root, 'android');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });

const configPath = path.join(root, 'app.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const [major, minor, patch] = config.expo.version.split('.').map(Number);
config.expo.version = [major, minor, patch + 1].join('.');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log('Version ' + config.expo.version);

// Writes the version into android/. This can regenerate the folder, so
// local.properties has to be put back afterwards.
run('npx expo prebuild --platform android --no-install');

// The CMake bundled by default can't handle Windows' long paths. See docs/BUILDING.md.
const cmake = path.join(process.env.ANDROID_HOME ?? '', 'cmake', '3.31.6');
if (process.platform === 'win32' && fs.existsSync(cmake)) {
  const escaped = cmake.replace(/\\/g, '\\\\').replace(':', '\\:');
  fs.writeFileSync(path.join(android, 'local.properties'), 'cmake.dir=' + escaped + '\n');
}

const gradlew = path.join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
run('"' + gradlew + '" app:assembleRelease -x lint -x test --configure-on-demand --build-cache', android);

const apk = path.join(android, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
try {
  run('"' + path.join(process.env.ANDROID_HOME ?? '', 'platform-tools', 'adb') + '" install -r "' + apk + '"');
} catch {
  console.log('Built, but not installed. Check that the phone shows up in `adb devices`. APK: ' + apk);
  process.exit(1);
}
