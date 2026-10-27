# Building the Android app

There are three ways to get an APK onto the phone. All of them can be used side by side.

| | Where it runs | Signed with | Installs over the current app? | Time |
|---|---|---|---|---|
| **EAS (cloud)** | Expo's servers | The EAS key | Yes | Queue + ~15 min |
| **Local (PC)** | Your PC | The EAS key (via `credentials.json`) | Yes | ~10 min first time, less after |
| **Android check (GitHub)** | GitHub Actions | A throwaway debug key | No, uninstall first (deletes breads) | ~20 min |

"Installs over" matters because Android only updates an app when the new APK has the same signing key. Uninstalling deletes your logged breads.

## EAS (cloud)

Use it when you're away from the PC, or for a build you want to keep a link to.

- GitHub: **Actions → EAS build → Run workflow**, profile `preview` (APK). It also runs on every push to `main`, and when a pull request gets the `build-apk` label.
- Or from the PC: `npx.cmd eas-cli@latest build -p android --profile preview`
- The APK link shows up on expo.dev. Open it on the phone to install.
- Profiles live in `eas.json`: `preview` (normal APK), `development` (dev client for instant reloads), `production` (Play Store bundle).

## Local (PC)

Use it to skip the EAS queue. The phone must be connected with `adb` (USB or wireless debugging; check with `adb devices`).

1. Open a **new** PowerShell window in this folder (old windows don't see updated environment variables).
2. Run: `npx.cmd expo run:android --variant release`

It builds, then installs on the phone as an update, so breads are kept.

### One-time setup this relies on

Already done on this PC; only needed again on a new PC or after a reset.

- **Android Studio**, plus the user environment variables `ANDROID_HOME` (the SDK folder) and `JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr`.
- **Long paths**: Windows setting `LongPathsEnabled = 1` (admin PowerShell: `New-ItemProperty -Path HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force`).
- **CMake 3.31.6** from Android Studio's SDK Manager (SDK Tools → Show Package Details), and `android/local.properties` containing:
  `cmake.dir=C\:\\Users\\mads\\AppData\\Local\\Android\\Sdk\\cmake\\3.31.6`
- **Signing key**: `npx.cmd eas-cli@latest credentials -p android` → pick the build profile → *credentials.json* → *Download credentials from EAS*. This creates `credentials.json` and `credentials/android/keystore.jks`. The plugin `plugins/withLocalReleaseSigning.js` makes release builds use them; without them, local builds fall back to the debug key and won't install over the EAS app.

`credentials.json`, `credentials/` and `android/` are ignored by git. Never commit them: the keystore is the app's identity.

### If something goes wrong

- **"Gradle requires JVM 17"**: the terminal was opened before `JAVA_HOME` was set. Open a new one.
- **"ninja: error: mkdir ... No such file or directory"**: path too long. Check the long-path setting and the `cmake.dir` line above (it disappears if `android/` is deleted or regenerated with `--clean`).
- **"INSTALL_FAILED_UPDATE_INCOMPATIBLE"**: the APK has a different key. Make sure `credentials.json` exists, then rebuild. Don't uninstall unless you're OK losing breads.
- **"INSTALL_FAILED_VERSION_DOWNGRADE"**: the phone has a newer `versionCode` (EAS `production` builds count up automatically). Raise `versionCode` or reinstall a `preview` build.

## Android check (GitHub)

Runs on every pull request to make sure the native code still compiles, and uploads the APK as `handbake-apk`. It's signed with a throwaway key, so it's for checking, not for installing on your phone.
