package expo.modules.handbakealarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object Notifications {
  /** Ringing alarms. The service plays the sound itself, so the channel is quiet. */
  private const val CHANNEL_ALARM = "handbake_alarm"
  /** Silent mode: ordinary notifications with the phone's notification sound. */
  private const val CHANNEL_STEPS = "handbake_steps"

  fun id(key: String) = 7000 + (key.hashCode() and 0xFFFF)

  fun ensureChannels(ctx: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ALARM) == null) {
      val c = NotificationChannel(CHANNEL_ALARM, "Bake alarms", NotificationManager.IMPORTANCE_HIGH)
      c.description = "Rings until you stop or snooze it"
      c.setSound(null, null)
      c.enableVibration(false)
      c.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      c.setBypassDnd(true)
      nm.createNotificationChannel(c)
    }
    if (nm.getNotificationChannel(CHANNEL_STEPS) == null) {
      val c = NotificationChannel(CHANNEL_STEPS, "Bake reminders (silent mode)", NotificationManager.IMPORTANCE_HIGH)
      c.description = "Used instead of the alarm while the bell is switched off"
      c.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      nm.createNotificationChannel(c)
    }
  }

  private fun smallIcon(ctx: Context): Int {
    val res = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName)
    return if (res != 0) res else ctx.applicationInfo.icon
  }

  /** The notification shown while the alarm rings; it also opens the full-screen alarm on the lock screen. */
  fun ringing(ctx: Context, r: AlarmRecord): Notification {
    ensureChannels(ctx)
    return NotificationCompat.Builder(ctx, CHANNEL_ALARM)
      .setSmallIcon(smallIcon(ctx))
      .setContentTitle(r.title)
      .setContentText(r.body)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(Alarms.screenPendingIntent(ctx, r.key, null))
      .setFullScreenIntent(Alarms.screenPendingIntent(ctx, r.key, null), true)
      .addAction(0, "Log this step", Alarms.screenPendingIntent(ctx, r.key, Alarms.ACTION_LOG))
      .addAction(0, "Snooze ${r.snoozeMinutes} min", Alarms.actionPendingIntent(ctx, r.key, Alarms.ACTION_SNOOZE))
      .addAction(0, "Stop", Alarms.actionPendingIntent(ctx, r.key, Alarms.ACTION_STOP))
      .build()
  }

  fun postSilent(ctx: Context, r: AlarmRecord) {
    ensureChannels(ctx)
    val n = NotificationCompat.Builder(ctx, CHANNEL_STEPS)
      .setSmallIcon(smallIcon(ctx))
      .setContentTitle(r.title)
      .setContentText(r.body)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setAutoCancel(true)
      .setContentIntent(Alarms.openAppPendingIntent(ctx))
      .addAction(0, "Log this step", Alarms.screenPendingIntent(ctx, r.key, Alarms.ACTION_LOG))
      .addAction(0, "Snooze ${r.snoozeMinutes} min", Alarms.actionPendingIntent(ctx, r.key, Alarms.ACTION_SNOOZE))
      .build()
    try {
      NotificationManagerCompat.from(ctx).notify(id(r.key), n)
    } catch (_: SecurityException) {
      // Notification permission not granted.
    }
  }

  fun cancel(ctx: Context, key: String) {
    NotificationManagerCompat.from(ctx).cancel(id(key))
  }
}
