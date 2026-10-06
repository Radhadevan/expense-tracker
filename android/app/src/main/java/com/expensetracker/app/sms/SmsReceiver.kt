package com.expensetracker.app.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log

/**
 * Native Android SMS BroadcastReceiver for detecting incoming transaction alerts.
 * 
 * Safety & Privacy Compliance:
 * 1. Checks if SMS auto-tracking is explicitly enabled by the user before processing.
 * 2. Immediately discards OTP messages, login verification codes, promo coupons, and personal messages.
 * 3. Never stores raw SMS bodies on disk or in the cloud.
 * 4. Dispatches detected financial message data to the Android-to-React bridge.
 */
class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"
        var isTrackingEnabled: Boolean = false

        // Fast regex to reject OTPs, coupons, and non-financial noise before parsing
        private val OTP_PATTERN = Regex(
            "\\b(?:otp|one\\s*time\\s*password|verification\\s*code|security\\s*code|login\\s*code|secret\\s*code)\\b",
            RegexOption.IGNORE_CASE
        )
        private val COUPON_PATTERN = Regex(
            "\\b(?:coupon|voucher|promo\\s*code|flat\\s*\\d+%|save\\s*\\d+|use\\s*code)\\b",
            RegexOption.IGNORE_CASE
        )
        private val DELIVERY_PATTERN = Regex(
            "\\b(?:order\\s*(?:will\\s*be|is)\\s*delivered|arriving\\s*today|out\\s*for\\s*delivery|shipment)\\b",
            RegexOption.IGNORE_CASE
        )

        // Financial keywords required for preliminary detection
        private val FINANCIAL_INDICATOR = Regex(
            "\\b(?:debited|credited|spent|withdrawn|purchase|paid|refund|salary|transfer|transferred|dr|cr|upi|atm|pos|a/c|card|inr|rs)\\b",
            RegexOption.IGNORE_CASE
        )
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        // 1. Check if user has opted in and enabled SMS tracking
        val prefs = context.getSharedPreferences("sms_tracking_prefs", Context.MODE_PRIVATE)
        val enabled = prefs.getBoolean("sms_tracking_enabled", false)
        if (!enabled && !isTrackingEnabled) {
            Log.d(TAG, "SMS received but tracking is disabled by user. Discarding.")
            return
        }

        // 2. Extract messages from Intent
        val messages: Array<SmsMessage>? = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        // Group message fragments if multi-part SMS
        val sender = messages[0].displayOriginatingAddress ?: "Unknown"
        val timestamp = messages[0].timestampMillis
        val bodyBuilder = StringBuilder()
        for (msg in messages) {
            bodyBuilder.append(msg.displayMessageBody)
        }
        val fullBody = bodyBuilder.toString().trim()

        if (fullBody.isEmpty()) return

        // 3. Privacy & Filter Check: Discard OTP, coupons & delivery status
        if (OTP_PATTERN.containsMatchIn(fullBody)) {
            Log.d(TAG, "Message filtered: OTP detected. Discarding.")
            return
        }
        if (COUPON_PATTERN.containsMatchIn(fullBody)) {
            Log.d(TAG, "Message filtered: Promotional coupon detected. Discarding.")
            return
        }
        if (DELIVERY_PATTERN.containsMatchIn(fullBody)) {
            Log.d(TAG, "Message filtered: Delivery alert detected. Discarding.")
            return
        }

        // 4. Check for financial transaction indicator
        if (!FINANCIAL_INDICATOR.containsMatchIn(fullBody)) {
            Log.d(TAG, "Message filtered: Non-financial personal SMS. Discarding.")
            return
        }

        Log.i(TAG, "Financial transaction message detected from $sender. Dispatching to bridge.")

        // 5. Dispatch message to the bridge listener for structured parsing
        AndroidSmsBridge.dispatchIncomingSms(fullBody, sender, timestamp)
    }
}
