# Handbake

A sourdough timer and logbook for one dough at a time. Expo SDK 58, Android first.

## Change the standard bake

Edit [`src/config/bake-plan.ts`](src/config/bake-plan.ts). Each step lists its name, how many minutes until the next step, what skipping it does, and the text shown in the app. Kitchen temperatures and the snooze length are at the bottom of the same file.

## Run it

- `npm start` and open in Expo Go: everything works except alarms, which need native code.
- For alarms, install an APK (below) or the development build.

## Develop on the PC with instant reloads

1. Install the development build on the phone once: **Actions → EAS build → Run workflow** with profile `development`, then open the APK link from expo.dev on the phone. It replaces the normal app and keeps your breads. Rebuild only when native code or native packages change (for example `modules/handbake-alarm`).
2. On the PC, in this folder: `npm.cmd install`, then `npm.cmd run dev` (runs `expo start --dev-client`).
3. Open Handbake on the phone and pick the PC from the list, or scan the QR code. The phone and PC must be on the same Wi-Fi. If it can't connect, plug in USB and run `adb reverse tcp:8081 tcp:8081`, then `npm.cmd run dev -- --localhost`.
4. Saving a file reloads the app. Shake the phone (or press `m` in the terminal) for the developer menu.

## Read crash logs

Install [Android SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools) (unzip, for example to `C:\platform-tools`, and add it to PATH). On the phone, turn on Developer options and USB debugging, plug in USB, accept the prompt, and check `adb devices`. Then:

```
adb logcat -c
adb logcat *:E ReactNativeJS:V AndroidRuntime:E > crash.txt
```

Reproduce the crash, press Ctrl+C, and share `crash.txt`. JavaScript errors in the development build also show as a red screen with a stack trace.

## Build an APK

See [docs/BUILDING.md](docs/BUILDING.md) for how the cloud (EAS) and local (PC) builds work and when to use which. In short, on the PC: `npx.cmd expo run:android --variant release`.

### Without your PC

- **Actions → EAS build → Run workflow** starts a build on Expo's servers (needs the repository secret `EXPO_TOKEN`). It also runs when `main` changes, or when a pull request gets the `build-apk` label. The APK link appears on expo.dev.
- **Actions → Android check** compiles the app for every pull request and uploads a standalone APK as `handbake-apk`. That APK is signed with a throwaway key, so installing it over an EAS build requires uninstalling first.

## Alarms

The local module in `modules/handbake-alarm` sets exact "alarm clock" alarms, rings with the phone's alarm sound until Stop, Snooze or Log this step, shows a full-screen alarm on the lock screen, and survives the app being closed or the phone restarting. In silent mode (the bell in the timeline header) it posts a normal notification instead.
