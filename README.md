# Handbake

A sourdough timer and logbook for one dough at a time. Expo SDK 58, Android first.

## Change the standard bake

Edit [`src/config/bake-plan.ts`](src/config/bake-plan.ts). Each step lists its name, how many minutes until the next step, what skipping it does, and the text shown in the app. Kitchen temperatures and the snooze length are at the bottom of the same file.

## Run it

- `npm start` and open in Expo Go: everything works except alarms, which need native code.
- For alarms, install an APK (below) or a development build (`eas build --profile development`).

## Build an APK without your PC

- **Actions → EAS build → Run workflow** starts a build on Expo's servers (needs the repository secret `EXPO_TOKEN`). It also runs when `main` changes. The APK link appears on expo.dev.
- **Actions → Android check** compiles the app on every push and uploads a standalone APK as `handbake-apk`. That APK is signed with a throwaway key, so installing it over an EAS build requires uninstalling first.

## Alarms

The local module in `modules/handbake-alarm` sets exact "alarm clock" alarms, rings with the phone's alarm sound until Stop, Snooze or Log this step, shows a full-screen alarm on the lock screen, and survives the app being closed or the phone restarting. In silent mode (the bell in the timeline header) it posts a normal notification instead.
