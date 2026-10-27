package expo.modules.handbakealarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat
import org.json.JSONObject

/** Scheduling and the actions behind the alarm buttons, shared by the module, receivers, service and alarm screen. */
object Alarms {
  const val ACTION_FIRE = "dk.prahm.handbake.alarm.FIRE"
  const val ACTION_SNOOZE = "dk.prahm.handbake.alarm.SNOOZE"
  const val ACTION_STOP = "dk.prahm.handbake.alarm.STOP"
  const val ACTION_LOG = "dk.prahm.handbake.alarm.LOG"
  const val ACTION_CLOSE_SCREEN = "dk.prahm.handbake.alarm.CLOSE_SCREEN"
  const val EXTRA_KEY = "key"

  fun requestCode(key: String, slot: Int) = key.hashCode() * 8 + slot

  private fun alarmManager(ctx: Context) = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  fun canScheduleExact(ctx: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager(ctx).canScheduleExactAlarms()

  private fun firePendingIntent(ctx: Context, key: String): PendingIntent {
    val i = Intent(ctx, AlarmReceiver::class.java).setAction(ACTION_FIRE).putExtra(EXTRA_KEY, key)
    return PendingIntent.getBroadcast(ctx, requestCode(key, 0), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun openAppPendingIntent(ctx: Context): PendingIntent? {
    val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: return null
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(ctx, 1, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun actionPendingIntent(ctx: Context, key: String, action: String): PendingIntent {
    val slot = when (action) {
      ACTION_SNOOZE -> 1
      ACTION_STOP -> 2
      else -> 3
    }
    val i = Intent(ctx, AlarmReceiver::class.java).setAction(action).putExtra(EXTRA_KEY, key)
    return PendingIntent.getBroadcast(ctx, requestCode(key, slot), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /** Opens the alarm screen; with ACTION_LOG it logs the step and opens the app instead. */
  fun screenPendingIntent(ctx: Context, key: String, action: String?): PendingIntent {
    val i = Intent(ctx, AlarmActivity::class.java)
      .putExtra(EXTRA_KEY, key)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
    if (action != null) i.action = action
    val slot = if (action == ACTION_LOG) 4 else 5
    return PendingIntent.getActivity(ctx, requestCode(key, slot), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun setSystemAlarm(ctx: Context, r: AlarmRecord) {
    val am = alarmManager(ctx)
    val pi = firePendingIntent(ctx, r.key)
    val at = maxOf(r.fireAt, System.currentTimeMillis() + 1000)
    if (canScheduleExact(ctx)) {
      // An "alarm clock" alarm is exact, wakes the phone from Doze and shows the alarm icon in the status bar.
      val show = openAppPendingIntent(ctx) ?: pi
      am.setAlarmClock(AlarmManager.AlarmClockInfo(at, show), pi)
    } else {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
    }
  }

  private fun clearSystemAlarm(ctx: Context, key: String) {
    alarmManager(ctx).cancel(firePendingIntent(ctx, key))
  }

  /**
   * Called by the app whenever the next step changes. Scheduling the same step for the same
   * time again keeps any snooze or stop the baker already chose.
   */
  fun schedule(ctx: Context, key: String, stepId: String, at: Long, title: String, body: String, silent: Boolean, snoozeMinutes: Int) {
    val existing = AlarmStore.get(ctx, key)
    if (existing != null && existing.stepId == stepId && existing.at == at) {
      val updated = existing.copy(title = title, body = body, silent = silent, snoozeMinutes = snoozeMinutes)
      AlarmStore.put(ctx, updated)
      if (!updated.fired) setSystemAlarm(ctx, updated)
      return
    }
    if (existing != null && AlarmService.ringingKey == key) stopRinging(ctx)
    if (existing != null) Notifications.cancel(ctx, key)
    val r = AlarmRecord(key, stepId, at, at, title, body, silent, snoozeMinutes, fired = false)
    AlarmStore.put(ctx, r)
    setSystemAlarm(ctx, r)
  }

  fun cancel(ctx: Context, key: String) {
    clearSystemAlarm(ctx, key)
    AlarmStore.remove(ctx, key)
    if (AlarmService.ringingKey == key) stopRinging(ctx)
    Notifications.cancel(ctx, key)
  }

  fun rescheduleAll(ctx: Context) {
    AlarmStore.all(ctx).values.filter { !it.fired }.forEach { setSystemAlarm(ctx, it) }
  }

  /** The alarm time has come: ring, or post a plain notification in silent mode. */
  fun fire(ctx: Context, key: String) {
    val r = AlarmStore.get(ctx, key) ?: return
    val fired = r.copy(fired = true)
    AlarmStore.put(ctx, fired)
    if (fired.silent) {
      Notifications.postSilent(ctx, fired)
      return
    }
    try {
      val i = Intent(ctx, AlarmService::class.java).putExtra(EXTRA_KEY, key)
      ContextCompat.startForegroundService(ctx, i)
    } catch (e: Exception) {
      // If Android refuses to start the ringing service, at least notify.
      Notifications.postSilent(ctx, fired)
    }
  }

  fun snooze(ctx: Context, key: String) {
    val r = AlarmStore.get(ctx, key) ?: return
    if (AlarmService.ringingKey == key) stopRinging(ctx)
    Notifications.cancel(ctx, key)
    val next = r.copy(fireAt = System.currentTimeMillis() + r.snoozeMinutes * 60_000L, fired = false)
    AlarmStore.put(ctx, next)
    setSystemAlarm(ctx, next)
  }

  fun stop(ctx: Context, key: String) {
    if (AlarmService.ringingKey == key) stopRinging(ctx)
    Notifications.cancel(ctx, key)
  }

  /** "Log this step": stop the alarm and leave the log entry for the app to pick up. */
  fun log(ctx: Context, key: String) {
    val r = AlarmStore.get(ctx, key)
    stop(ctx, key)
    if (r == null) return
    AlarmStore.addPending(
      ctx,
      JSONObject().put("type", "log").put("key", key).put("stepId", r.stepId).put("at", System.currentTimeMillis())
    )
  }

  fun stopRinging(ctx: Context) {
    ctx.stopService(Intent(ctx, AlarmService::class.java))
    AlarmService.ringingKey = null
    ctx.sendBroadcast(Intent(ACTION_CLOSE_SCREEN).setPackage(ctx.packageName))
  }

  fun notificationsEnabled(ctx: Context): Boolean =
    (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).areNotificationsEnabled()

  fun canUseFullScreen(ctx: Context): Boolean =
    Build.VERSION.SDK_INT < 34 ||
      (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()
}
