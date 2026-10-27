package expo.modules.handbakealarm

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HandbakeAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("HandbakeAlarm")

    OnCreate {
      appContext.reactContext?.let { Notifications.ensureChannels(it) }
    }

    Function("schedule") { key: String, stepId: String, at: Double, title: String, body: String, silent: Boolean, snoozeMinutes: Int ->
      Alarms.schedule(context, key, stepId, at.toLong(), title, body, silent, snoozeMinutes)
    }

    Function("cancel") { key: String ->
      Alarms.cancel(context, key)
    }

    Function("stopRinging") {
      Alarms.stopRinging(context)
    }

    Function("consumePendingActions") {
      AlarmStore.takePending(context)
    }

    Function("status") {
      mapOf(
        "exactAlarms" to Alarms.canScheduleExact(context),
        "fullScreen" to Alarms.canUseFullScreen(context),
        "notifications" to Alarms.notificationsEnabled(context)
      )
    }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        open(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + context.packageName)))
      }
    }

    Function("openFullScreenSettings") {
      if (Build.VERSION.SDK_INT >= 34) {
        open(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + context.packageName)))
      }
    }

    Function("openNotificationSettings") {
      open(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName))
    }

    Function("test") { silent: Boolean, seconds: Int ->
      val at = System.currentTimeMillis() + seconds * 1000L
      // A fresh step id each time, so a stopped test can be tried again.
      Alarms.schedule(context, "test", "test-$at", at, "Test alarm", "This is how a step will ring", silent, 5)
    }
  }

  private fun open(i: Intent) {
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(i)
    } catch (_: Exception) {
      context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }
  }
}
