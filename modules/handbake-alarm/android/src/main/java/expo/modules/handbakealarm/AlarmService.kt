package expo.modules.handbakealarm

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.ServiceCompat

/**
 * Rings like the phone's own timer: the alarm sound on the alarm volume, looping with vibration,
 * until Stop, Snooze or Log this step. On the lock screen, the notification's full-screen
 * intent opens [AlarmActivity]; when the phone is in use it shows as a heads-up notification.
 */
class AlarmService : Service() {
  companion object {
    @Volatile
    var ringingKey: String? = null
  }

  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val key = intent?.getStringExtra(Alarms.EXTRA_KEY)
    val r = key?.let { AlarmStore.get(this, it) }
    if (r == null) {
      stopSelf()
      return START_NOT_STICKY
    }
    // A second alarm while one rings: drop the old notification and ring for the new one.
    ringingKey?.let { if (it != key) Notifications.cancel(this, it) }
    ringingKey = key

    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else 0
    ServiceCompat.startForeground(this, Notifications.id(key), Notifications.ringing(this, r), type)

    startSound()
    startVibration()
    return START_NOT_STICKY
  }

  private fun alarmUri(): Uri? =
    RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

  private fun startSound() {
    if (player != null) return
    val uri = alarmUri() ?: return
    try {
      player = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        setWakeMode(this@AlarmService, PowerManager.PARTIAL_WAKE_LOCK)
        setDataSource(this@AlarmService, uri)
        isLooping = true
        prepare()
        start()
      }
    } catch (_: Exception) {
      player?.release()
      player = null
    }
  }

  private fun startVibration() {
    if (vibrator != null) return
    val v = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    vibrator = v
    val pattern = longArrayOf(0, 600, 400, 600, 1400)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      v.vibrate(
        VibrationEffect.createWaveform(pattern, 0),
        AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
      )
    } else {
      @Suppress("DEPRECATION")
      v.vibrate(pattern, 0)
    }
  }

  override fun onDestroy() {
    try {
      player?.stop()
    } catch (_: Exception) {
    }
    player?.release()
    player = null
    vibrator?.cancel()
    vibrator = null
    ringingKey = null
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }
}
