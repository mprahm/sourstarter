package expo.modules.handbakealarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Receives the system alarm and the Snooze and Stop notification buttons. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    val key = intent.getStringExtra(Alarms.EXTRA_KEY) ?: return
    when (intent.action) {
      Alarms.ACTION_FIRE -> Alarms.fire(ctx, key)
      Alarms.ACTION_SNOOZE -> Alarms.snooze(ctx, key)
      Alarms.ACTION_STOP -> Alarms.stop(ctx, key)
    }
  }
}

/** Alarms are forgotten when the phone restarts or the app updates, so set them again. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    Alarms.rescheduleAll(ctx)
  }
}
