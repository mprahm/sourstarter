import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type AlarmRequest = {
  /** One alarm slot per key (the bake id). Scheduling again replaces it. */
  key: string;
  stepId: string;
  /** When the step is due, epoch ms. */
  at: number;
  title: string;
  body: string;
  silent: boolean;
  snoozeMinutes: number;
};

export type PendingAction = { type: 'log'; key: string; stepId: string; at: number };

export type AlarmStatus = {
  exactAlarms: boolean;
  fullScreen: boolean;
  notifications: boolean;
};

type NativeModule = {
  schedule(key: string, stepId: string, at: number, title: string, body: string, silent: boolean, snoozeMinutes: number): void;
  cancel(key: string): void;
  stopRinging(): void;
  consumePendingActions(): string;
  status(): AlarmStatus;
  openExactAlarmSettings(): void;
  openFullScreenSettings(): void;
  openNotificationSettings(): void;
  test(silent: boolean, seconds: number): void;
};

// Missing in Expo Go and on the web: the app still runs, only without alarms.
const native = Platform.OS === 'android' ? requireOptionalNativeModule<NativeModule>('HandbakeAlarm') : null;

export const alarmsAvailable = !!native;

export function scheduleAlarm(r: AlarmRequest) {
  native?.schedule(r.key, r.stepId, r.at, r.title, r.body, r.silent, r.snoozeMinutes);
}

export function cancelAlarm(key: string) {
  native?.cancel(key);
}

export function stopRinging() {
  native?.stopRinging();
}

/** Actions pressed on an alarm while the app was in the background or closed. */
export function consumePendingActions(): PendingAction[] {
  if (!native) return [];
  try {
    return JSON.parse(native.consumePendingActions());
  } catch {
    return [];
  }
}

export function alarmStatus(): AlarmStatus | null {
  return native ? native.status() : null;
}

export const openExactAlarmSettings = () => native?.openExactAlarmSettings();
export const openFullScreenSettings = () => native?.openFullScreenSettings();
export const openNotificationSettings = () => native?.openNotificationSettings();

/** Rings (or notifies, when silent) in `seconds`, so it can be tried with the app closed. */
export function testAlarm(silent: boolean, seconds = 10) {
  native?.test(silent, seconds);
}
