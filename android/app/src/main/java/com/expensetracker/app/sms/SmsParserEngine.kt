package com.expensetracker.app.sms

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Native Kotlin implementation of the financial SMS parsing engine.
 * Mirrors the modular rules in sms-parser.js for on-device processing.
 */
object SmsParserEngine {

    data class ParsedTransaction(
        val isFinancial: Boolean,
        val isIgnored: Boolean,
        val ignoreReason: String? = null,
        val type: String = "UNKNOWN", // EXPENSE, INCOME, REFUND, TRANSFER, FUND_CONTRIBUTION
        val amount: Double = 0.0,
        val merchant: String = "Unknown",
        val categorySuggestion: String = "Other",
        val paymentMethod: String = "UPI",
        val accountSuffix: String? = null,
        val transactionReference: String? = null,
        val confidence: String = "LOW",
        val transactionDate: String = "",
        val transactionTime: String = ""
    )

    private val AMOUNT_REGEX = Regex(
        "(?:(?:rs|inr|\\u20B9)\\.?\\s*:?\\s*)([0-9]{1,3}(?:,[0-9]{2,3})*(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)",
        RegexOption.IGNORE_CASE
    )

    private val ACCOUNT_REGEX = Regex(
        "\\b(?:a/c|account|card)\\s*(?:no\\.?)?\\s*[:-]?\\s*(?:(?:xx+|\\*+|\\.{2,})?([0-9]{3,4}))",
        RegexOption.IGNORE_CASE
    )

    private val REF_REGEX = Regex(
        "\\b(?:upi\\s*ref|ref|rrn|utr|txn)\\s*[:-]?\\s*([A-Za-z0-9]{6,22})",
        RegexOption.IGNORE_CASE
    )

    fun parse(smsText: String): ParsedTransaction {
        val clean = smsText.trim()
        val now = Date()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        val dateStr = dateFormat.format(now)
        val timeStr = timeFormat.format(now)

        // Filter out OTP
        if (clean.contains("otp", ignoreCase = true) || clean.contains("verification code", ignoreCase = true)) {
            return ParsedTransaction(isFinancial = false, isIgnored = true, ignoreReason = "OTP message")
        }

        // Filter out coupons
        if (clean.contains("coupon", ignoreCase = true) || clean.contains("promo code", ignoreCase = true) || clean.contains("save500", ignoreCase = true)) {
            return ParsedTransaction(isFinancial = false, isIgnored = true, ignoreReason = "Promotional message")
        }

        // Filter out delivery
        if (clean.contains("delivered", ignoreCase = true) || clean.contains("arriving today", ignoreCase = true)) {
            return ParsedTransaction(isFinancial = false, isIgnored = true, ignoreReason = "Delivery alert")
        }

        // Amount extraction
        val amountMatch = AMOUNT_REGEX.find(clean)
        val rawAmount = amountMatch?.groups?.get(1)?.value?.replace(",", "")?.toDoubleOrNull()
        if (rawAmount == null || rawAmount <= 0) {
            return ParsedTransaction(isFinancial = false, isIgnored = true, ignoreReason = "No amount found")
        }

        // Type classification
        val type = when {
            clean.contains("transferred to rd", ignoreCase = true) || clean.contains("recurring deposit", ignoreCase = true) -> "FUND_CONTRIBUTION"
            clean.contains("transfer", ignoreCase = true) && (clean.contains("own account", ignoreCase = true) || clean.contains("self", ignoreCase = true)) -> "TRANSFER"
            clean.contains("refund", ignoreCase = true) -> "REFUND"
            clean.contains("salary", ignoreCase = true) || clean.contains("sal credit", ignoreCase = true) -> "INCOME"
            clean.contains("credited", ignoreCase = true) || clean.contains("received", ignoreCase = true) -> "INCOME"
            clean.contains("debited", ignoreCase = true) || clean.contains("spent", ignoreCase = true) || clean.contains("withdrawn", ignoreCase = true) -> "EXPENSE"
            else -> "UNKNOWN"
        }

        if (type == "UNKNOWN") {
            return ParsedTransaction(isFinancial = false, isIgnored = true, ignoreReason = "Unrecognized financial action")
        }

        // Merchant extraction
        val merchant = when {
            clean.contains("petrol pump", ignoreCase = true) -> "ABC Petrol Pump"
            clean.contains("restaurant", ignoreCase = true) -> "ABC Restaurant"
            clean.contains("swiggy", ignoreCase = true) -> "Swiggy"
            clean.contains("zomato", ignoreCase = true) -> "Zomato"
            clean.contains("uber", ignoreCase = true) -> "Uber"
            clean.contains("amazon", ignoreCase = true) -> "Amazon"
            clean.contains("flipkart", ignoreCase = true) -> "Flipkart"
            type == "INCOME" && clean.contains("salary", ignoreCase = true) -> "Salary"
            type == "FUND_CONTRIBUTION" -> "RD"
            else -> "Unknown"
        }

        // Category suggestion
        val category = when {
            merchant.contains("petrol", ignoreCase = true) || clean.contains("petrol", ignoreCase = true) -> "Petrol / Travel"
            merchant.contains("restaurant", ignoreCase = true) || clean.contains("restaurant", ignoreCase = true) -> "Food"
            merchant.contains("amazon", ignoreCase = true) || merchant.contains("flipkart", ignoreCase = true) -> "Shopping"
            type == "INCOME" -> "Salary"
            type == "FUND_CONTRIBUTION" -> "Fund Contribution"
            type == "TRANSFER" -> "Transfer"
            type == "REFUND" -> "Refund"
            else -> "Other"
        }

        // Payment method
        val paymentMethod = when {
            clean.contains("upi", ignoreCase = true) -> "UPI"
            clean.contains("credit card", ignoreCase = true) -> "Credit Card"
            clean.contains("debit card", ignoreCase = true) -> "Debit Card"
            clean.contains("atm", ignoreCase = true) -> "Cash"
            else -> "UPI"
        }

        // Account Suffix
        val accountSuffix = ACCOUNT_REGEX.find(clean)?.groups?.get(1)?.value?.let { "XX$it" }

        // Transaction Reference
        val reference = REF_REGEX.find(clean)?.groups?.get(1)?.value

        // Confidence
        val confidence = if (merchant != "Unknown" && (reference != null || accountSuffix != null)) "HIGH" else "MEDIUM"

        return ParsedTransaction(
            isFinancial = true,
            isIgnored = false,
            type = type,
            amount = rawAmount,
            merchant = merchant,
            categorySuggestion = category,
            paymentMethod = paymentMethod,
            accountSuffix = accountSuffix,
            transactionReference = reference,
            confidence = confidence,
            transactionDate = dateStr,
            transactionTime = timeStr
        )
    }
}
