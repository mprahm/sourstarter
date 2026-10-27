package expo.modules.handbakealarm

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** One scheduled alarm. There is at most one per key (bake). */
data class AlarmRecord(
  val key: String,
  val stepId: String,
  /** When the step is due, as planned by the app. */
  val at: Long,
  /** When the alarm will actually go off (later than `at` after a snooze). */
  val fireAt: Long,
  val title: String,
  val body: String,
  val silent: Boolean,
  val snoozeMinutes: Int,
  val fired: Boolean
) {
  fun toJson(): JSONObject = JSONObject()
    .put("key", key).put("stepId", stepId).put("at", at).put("fireAt", fireAt)
    .put("title", title).put("body", body).put("silent", silent)
    .put("snoozeMinutes", snoozeMinutes).put("fired", fired)

  companion object {
    fun fromJson(o: JSONObject) = AlarmRecord(
      key = o.getString("key"),
      stepId = o.getString("stepId"),
      at = o.getLong("at"),
      fireAt = o.getLong("fireAt"),
      title = o.optString("title"),
      body = o.optString("body"),
      silent = o.optBoolean("silent"),
      snoozeMinutes = o.optInt("snoozeMinutes", 5),
      fired = o.optBoolean("fired")
    )
  }
}

/** Alarms and pending actions, kept in SharedPreferences so they survive the app being closed or the phone restarting. */
object AlarmStore {
  private const val PREFS = "handbake_alarm"
  private const val ALARMS = "alarms"
  private const val PENDING = "pending"

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized
  fun all(ctx: Context): MutableMap<String, AlarmRecord> {
    val out = mutableMapOf<String, AlarmRecord>()
    val raw = prefs(ctx).getString(ALARMS, null) ?: return out
    try {
      val arr = JSONArray(raw)
      for (i in 0 until arr.length()) {
        val r = AlarmRecord.fromJson(arr.getJSONObject(i))
        out[r.key] = r
      }
    } catch (_: Exception) {
    }
    return out
  }

  @Synchronized
  private fun saveAll(ctx: Context, map: Map<String, AlarmRecord>) {
    val arr = JSONArray()
    map.values.forEach { arr.put(it.toJson()) }
    prefs(ctx).edit().putString(ALARMS, arr.toString()).commit()
  }

  @Synchronized
  fun get(ctx: Context, key: String): AlarmRecord? = all(ctx)[key]

  @Synchronized
  fun put(ctx: Context, r: AlarmRecord) {
    val map = all(ctx)
    map[r.key] = r
    saveAll(ctx, map)
  }

  @Synchronized
  fun remove(ctx: Context, key: String) {
    val map = all(ctx)
    if (map.remove(key) != null) saveAll(ctx, map)
  }

  @Synchronized
  fun addPending(ctx: Context, action: JSONObject) {
    val arr = try {
      JSONArray(prefs(ctx).getString(PENDING, "[]"))
    } catch (_: Exception) {
      JSONArray()
    }
    arr.put(action)
    prefs(ctx).edit().putString(PENDING, arr.toString()).commit()
  }

  @Synchronized
  fun takePending(ctx: Context): String {
    val raw = prefs(ctx).getString(PENDING, "[]") ?: "[]"
    prefs(ctx).edit().remove(PENDING).commit()
    return raw
  }
}
