package com.expensetracker.app.sms

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * Android Native to JavaScript SMS Bridge
 * Provides JavascriptInterface methods for React web view and event dispatching.
 */
class AndroidSmsBridge(private val context: Context, webView: WebView) {

    companion object {
        private const val PERMISSION_REQUEST_CODE_RECEIVE = 1001
        private const val PERMISSION_REQUEST_CODE_READ = 1002

        private var webViewRef: WeakReference<WebView>? = null

        fun setWebView(webView: WebView) {
            webViewRef = WeakReference(webView)
        }

        /**
         * Dispatches newly received SMS to the React frontend.
         */
        fun dispatchIncomingSms(body: String, sender: String, timestamp: Long) {
            val json = JSONObject().apply {
                put("body", body)
                put("sender", sender)
                put("timestamp", timestamp)
            }

            val jsCode = "if (window.__onNativeSmsReceived) { window.__onNativeSmsReceived(${json.toString()}); }"

            Handler(Looper.getMainLooper()).post {
                webViewRef?.get()?.evaluateJavascript(jsCode, null)
            }
        }
    }

    init {
        setWebView(webView)
    }

    @JavascriptInterface
    fun isSupported(): Boolean {
        return true
    }

    @JavascriptInterface
    fun hasPermission(permissionType: String): Boolean {
        val permission = if (permissionType == "READ_SMS") {
            Manifest.permission.READ_SMS
        } else {
            Manifest.permission.RECEIVE_SMS
        }
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun requestPermission(permissionType: String): Boolean {
        val activity = context as? Activity ?: return false
        val permission = if (permissionType == "READ_SMS") {
            Manifest.permission.READ_SMS
        } else {
            Manifest.permission.RECEIVE_SMS
        }
        val requestCode = if (permissionType == "READ_SMS") {
            PERMISSION_REQUEST_CODE_READ
        } else {
            PERMISSION_REQUEST_CODE_RECEIVE
        }

        if (ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(activity, arrayOf(permission), requestCode)
            return false
        }
        return true
    }

    @JavascriptInterface
    fun setReceiverEnabled(enabled: Boolean) {
        val prefs = context.getSharedPreferences("sms_tracking_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("sms_tracking_enabled", enabled).apply()
        SmsReceiver.isTrackingEnabled = enabled
    }

    /**
     * User-initiated scan of SMS inbox for historical transactions.
     * Only queries messages within the specified past days.
     */
    @JavascriptInterface
    fun queryHistoricalSms(days: Int): String {
        val jsonArray = JSONArray()
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            return jsonArray.toString()
        }

        val cutoffMillis = System.currentTimeMillis() - (days.toLong() * 24 * 60 * 60 * 1000)
        val uri = Uri.parse("content://sms/inbox")
        val projection = arrayOf("address", "body", "date")
        val selection = "date >= ?"
        val selectionArgs = arrayOf(cutoffMillis.toString())
        val sortOrder = "date DESC LIMIT 200"

        try {
            val cursor = context.contentResolver.query(uri, projection, selection, selectionArgs, sortOrder)
            cursor?.use {
                val addressIdx = it.getColumnIndexOrThrow("address")
                val bodyIdx = it.getColumnIndexOrThrow("body")
                val dateIdx = it.getColumnIndexOrThrow("date")

                while (it.moveToNext()) {
                    val body = it.getString(bodyIdx) ?: ""
                    val sender = it.getString(addressIdx) ?: "Unknown"
                    val date = it.getLong(dateIdx)

                    // Skip OTP / promo noise
                    if (body.contains("otp", ignoreCase = true) ||
                        body.contains("coupon", ignoreCase = true) ||
                        body.contains("delivered", ignoreCase = true)) {
                        continue
                    }

                    // Check financial keywords
                    if (body.contains("debited", ignoreCase = true) ||
                        body.contains("credited", ignoreCase = true) ||
                        body.contains("spent", ignoreCase = true) ||
                        body.contains("refund", ignoreCase = true) ||
                        body.contains("salary", ignoreCase = true) ||
                        body.contains("transfer", ignoreCase = true)) {
                        
                        val item = JSONObject().apply {
                            put("sender", sender)
                            put("body", body)
                            put("timestamp", date)
                        }
                        jsonArray.put(item)
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return jsonArray.toString()
    }
}
