// Signs local release builds (`npx expo run:android --variant release`) with the
// same keystore EAS uses, so a local APK installs over an EAS-built one.
// Reads credentials.json (from `eas credentials` -> "Download credentials") at
// Gradle time, so no passwords end up in the generated android/ folder.
// Without credentials.json, release builds fall back to the debug key.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// withLocalReleaseSigning';

const SIGNING_BLOCK = `
        ${MARKER}
        def easCredentialsFile = rootProject.file('../credentials.json')
        if (easCredentialsFile.exists()) {
            def easKeystore = new groovy.json.JsonSlurper().parse(easCredentialsFile).android.keystore
            release {
                storeFile rootProject.file("../\${easKeystore.keystorePath}")
                storePassword easKeystore.keystorePassword
                keyAlias easKeystore.keyAlias
                keyPassword easKeystore.keyPassword
            }
        }`;

module.exports = function withLocalReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes(MARKER)) return config;

    gradle = gradle.replace(
      /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.findByName("release") ?: signingConfigs.debug'
    );
    gradle = gradle.replace(/signingConfigs\s*\{/, (match) => match + SIGNING_BLOCK);
    config.modResults.contents = gradle;
    return config;
  });
};
