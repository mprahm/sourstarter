package expo.modules.handbakealarm

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** The full-screen alarm shown over the lock screen, and the target of the "Log this step" button. */
class AlarmActivity : Activity() {
  private var key: String? = null
  private val handler = Handler(Looper.getMainLooper())
  private var clockView: TextView? = null
  private val tick = object : Runnable {
    override fun run() {
      clockView?.text = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
      handler.postDelayed(this, 1000)
    }
  }
  private val closeReceiver = object : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) = finish()
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (handleAction(intent)) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    ContextCompat.registerReceiver(this, closeReceiver, IntentFilter(Alarms.ACTION_CLOSE_SCREEN), ContextCompat.RECEIVER_NOT_EXPORTED)
    build()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    if (!handleAction(intent)) build()
  }

  /** "Log this step" from the notification: no screen, just log, then open the app. */
  private fun handleAction(i: Intent): Boolean {
    key = i.getStringExtra(Alarms.EXTRA_KEY)
    if (i.action != Alarms.ACTION_LOG) return false
    key?.let { Alarms.log(this, it) }
    openApp()
    finish()
    return true
  }

  private fun openApp() {
    packageManager.getLaunchIntentForPackage(packageName)?.let {
      it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      startActivity(it)
    }
  }

  private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics).toInt()

  private fun build() {
    val k = key ?: return finish()
    val r = AlarmStore.get(this, k) ?: return finish()
    val ink = Color.parseColor("#F2F2F0")
    val bg = Color.parseColor("#0E0E0E")
    val muted = Color.parseColor("#8F8F8B")

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(bg)
      setPadding(dp(24f), dp(72f), dp(24f), dp(56f))
    }
    val top = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
    }
    fun text(s: String, size: Float, color: Int, face: Typeface, spacing: Float = 0f) = TextView(this).apply {
      text = s
      setTextColor(color)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
      typeface = face
      gravity = Gravity.CENTER
      letterSpacing = spacing
    }
    top.addView(text("HANDBAKE", 11f, muted, Typeface.MONOSPACE, 0.12f))
    clockView = text("", 84f, ink, Typeface.create("sans-serif-light", Typeface.NORMAL), -0.03f).also {
      it.setPadding(0, dp(28f), 0, dp(12f))
      top.addView(it)
    }
    top.addView(text(r.title, 26f, ink, Typeface.create("sans-serif-medium", Typeface.NORMAL)))
    top.addView(text(r.body, 15f, muted, Typeface.DEFAULT).also { it.setPadding(0, dp(8f), 0, 0) })
    root.addView(top, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))

    fun button(label: String, filled: Boolean, onClick: () -> Unit) = Button(this).apply {
      text = label
      isAllCaps = false
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
      typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
      setTextColor(if (filled) bg else ink)
      stateListAnimator = null
      background = GradientDrawable().apply {
        cornerRadius = dp(14f).toFloat()
        if (filled) setColor(ink) else {
          setColor(Color.TRANSPARENT)
          setStroke(dp(1f), muted)
        }
      }
      setOnClickListener { onClick() }
    }
    root.addView(
      button("Log this step", true) {
        Alarms.log(this, k)
        openApp()
        finish()
      },
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64f))
    )
    val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
    val half = { LinearLayout.LayoutParams(0, dp(56f), 1f) }
    row.addView(button("Snooze ${r.snoozeMinutes} min", false) { Alarms.snooze(this, k); finish() }, half().apply { marginEnd = dp(6f) })
    row.addView(button("Stop", false) { Alarms.stop(this, k); finish() }, half().apply { marginStart = dp(6f) })
    root.addView(row, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(12f) })

    setContentView(root)
    handler.removeCallbacks(tick)
    handler.post(tick)
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    try {
      unregisterReceiver(closeReceiver)
    } catch (_: Exception) {
    }
    super.onDestroy()
  }
}
