# Google Play SMS & Call Log Permissions Policy Declaration Guide

This document outlines the policy compliance strategy and submission details for the **Expense Tracker** application under Google Play's **SMS and Call Log Permissions Policy**.

---

## 1. Core Purpose and Permitted Use Case

Google Play restricts `RECEIVE_SMS` and `READ_SMS` permissions to apps that fall under specific permitted use cases or exceptions. For Expense Tracker:

- **Target Category:** Personal Finance Tracking / Financial Management
- **Declared Purpose:** Automatic detection and parsing of incoming bank and UPI debit/credit transactional SMS alerts to maintain an accurate personal expenditure ledger.
- **Core Functionality Statement:**
  > *"Expense Tracker automatically identifies financial transaction alert messages received from verified banking institutions and UPI services (such as HDFC, SBI, ICICI, Axis, Google Pay, PhonePe, Paytm). It extracts structured transaction parameters (amount, merchant, date, payment mode) to log expenses and income into the user's private ledger without requiring manual data entry for every receipt."*

---

## 2. Privacy & Data Handling Safeguards

To satisfy Google Play review standards, the application implements the following strict privacy controls:

1. **Explicit In-App User Disclosure:**
   - Permissions are **never requested on app launch**.
   - Before requesting runtime permissions, the app displays a prominent disclosure dialog:
     - Clear explanation of why SMS access is requested.
     - Reassurance that only financial alerts will be processed.
     - Clear buttons: `[Enable SMS Tracking]` and `[Not Now]`.
   - If permission is denied, the user is notified with graceful degradation:
     *"SMS tracking is disabled. You can continue adding transactions manually."*

2. **Immediate Local Filtering of Sensitive & Personal Messages:**
   - **OTPs, login codes, two-factor authentication, security PINs** are detected via regex filters and **immediately discarded on-device**.
   - **Promotional coupons and marketing messages** (e.g. `Use code SAVE500`) are discarded.
   - **Delivery and tracking updates** (e.g. `Order arriving today`) are discarded.
   - **Personal chat and non-financial messages** are discarded without processing.

3. **No Raw SMS Uploads:**
   - Raw SMS bodies are **never saved to the permanent database** and **never uploaded to Supabase or third-party servers**.
   - Only normalized financial fields (`amount`, `merchant`, `category`, `paymentMethod`, `transactionDate`, `reference`) are stored.

4. **Zero Advertising & Zero Third-Party Sharing:**
   - SMS data is never used for advertising, credit scoring, cross-app profiling, or marketing.
   - Data is strictly isolated per user using Supabase Row Level Security (RLS).

5. **Instant Revocation & Disable Option:**
   - Users can toggle SMS Auto-Tracking off at any time under **More → SMS Auto-Tracking**.
   - Disabling stops the native Android BroadcastReceiver immediately.
   - Existing transactions remain safely in the user's ledger.

---

## 3. Required Permissions Rationale

| Permission | Justification | Trigger / When Requested |
|---|---|---|
| `android.permission.RECEIVE_SMS` | Real-time detection of incoming debit and credit transaction messages from banks and UPI. | Only after explicit user opt-in via the in-app disclosure sheet. |
| `android.permission.READ_SMS` | Optional scan of previous banking transactions when user taps "Import Previous Transactions" (7, 30, or 90 days). | Only when user explicitly initiates historical import. |

---

## 4. Google Play Console Declaration Form Responses

When submitting the application in the Google Play Console:

1. **Core Function:** Select **Financial management (e.g., banking, budgeting)**.
2. **Describe how the feature works:**
   *"The app listens for incoming transactional SMS alerts from banks and UPI services. When an SMS arrives, an on-device regex engine verifies if it is a financial receipt. If non-financial or an OTP, it is immediately discarded. If financial, the amount and merchant are extracted to create an expense record, which the user reviews and confirms."*
3. **Short Demonstration Video:**
   Provide a YouTube video showing:
   - User navigating to Settings → SMS Auto Tracking
   - Reading the in-app disclosure
   - Granting permission
   - Receiving a simulated or test bank SMS
   - Transaction appearing on the screen for confirmation
   - Disabling SMS tracking and showing manual entry fallback.

---

## 5. Fallback Modes for Non-Permitted Environments

If distributing on platforms or regions where SMS permissions cannot be approved:
- The app automatically detects environment support via `AndroidSmsBridge.checkSupport()`.
- On Web, iOS, or unsupported environments, SMS tracking is gracefully deactivated.
- Users can utilize the **Developer SMS Simulator** for manual pasting/testing and full manual ledger entry.
