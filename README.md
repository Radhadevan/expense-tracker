# Expense Tracker — Standalone Mobile-First Personal Finance App

A standalone, premium, mobile-first personal finance tracking application built with **React 18**, **TypeScript**, **Supabase Cloud Database (with Row Level Security)**, and **Progressive Web App (PWA)** offline capabilities.

Designed with a deep charcoal / near-black aesthetic, neon acid green accents, glassmorphism cards, and mathematical accuracy with zero hardcoded totals.

---

## 🌟 Architecture & Core Principles

1. **📱 Android Mobile-First Design:**
   - Fixed bottom navigation bar with active acid green indicator: `HOME | TRANSACTIONS | FUNDS | BUDGET | REPORTS | MORE`.
   - Bottom-sheet dialogs for modal interactions on mobile devices.
   - PWA standalone display mode with safe-area notch and home indicator support.

2. **⚡ Dynamic Financial Balance Engine:**
   - **Formula:** `Available Balance = Total Income - Total Expenses - Allocated Funds`.
   - Complete distinction between:
     - **SPENDING** = Money consumed (affects monthly expenses & budget).
     - **FUND CONTRIBUTIONS** = Money saved & allocated (RD, Weekly Savings, Emergency Goals — not double-counted as expenses!).
     - **TRANSFERS** = Money moved between accounts.
   - Decimal-safe arithmetic eliminating floating-point rounding errors.

3. **☁️ Supabase Cloud Database & RLS:**
   - Fully normalized tables: `profiles`, `transactions`, `categories`, `funds`, `fund_contributions`, `budgets`, `category_budgets`, `recurring_payments`, `payment_methods`.
   - Complete Row Level Security (RLS) policies ensuring 100% user data isolation (`auth.uid() = user_id`).
   - SQL setup migration file: [`supabase-schema.sql`](file:///r:/projects/daily-expense/supabase-schema.sql).

4. **💾 100% Offline Resilience & Zero Data Loss:**
   - Automatically saves all records to browser `localStorage`.
   - Sync queue for offline-created transactions.
   - Full JSON backup export and import.
   - PWA Service Worker caching with Network-First strategy.

---

## 🧭 Main Navigation & Pages

### 1. 🏠 Home Page (Overview Only)
- Greeting: Dynamic time-of-day greeting (e.g. *"Good Morning, Radhadevan 👋"*).
- Month Navigator: `‹ Current Month Year ›` with 1-click `Today` jump.
- **Main Balance Card**:
  - `AVAILABLE BALANCE`: `₹10,500`
  - `OF ₹25,000 INCOME` with dynamic savings percentage badge.
- **Three Compact KPI Cards**:
  - `INCOME`: `₹25,000` (Emerald Green)
  - `EXPENSES`: `₹14,500` (Neon Pink)
  - `SAVINGS`: `₹10,500` (Acid Green)
- **Today's Spending & Monthly Budget Widgets**:
  - Today's spend volume and transaction count.
  - Budget bar showing % used with multi-state progress indicators.
- **This Month's Spending Donut Chart**:
  - Category distribution with percentage breakdown.
- **Recent Transactions (Latest 4–5 only)**:
  - Clean cards showing category icon, merchant/description, payment mode, and amount.
- **Prominent `+ ADD TRANSACTION` Action Button**.

### 2. 📋 Transactions Page (Main Financial Log)
- Chronological transaction ledger with dates and timestamps.
- **Filters & Search**:
  - Full-text search (merchant, note, payment method).
  - Type Filter: All, Expenses, Income, Fund Contributions, Transfers.
  - Category Filter: Food, Travel, Rent, EMI, Bills, Shopping, Gym, Salary, etc.
  - Sorting: Newest, Oldest, Highest Amount, Lowest Amount.
- **Actions**:
  - `+ New` button to log transactions.
  - Edit existing transactions.
  - 1-click **Duplicate Transaction** (copies details to today's date).
  - Delete with safety confirmation dialog.

### 3. 🏦 Funds Page (Savings, RD, Recurring Funds)
- Dedicated savings and wealth accumulation hub:
  - **RD (Recurring Deposit)**: Target: ₹12,000, Saved: ₹1,000, Contribution: ₹1,000/month.
  - **Weekly Saving Fund**: Target: ₹1,600, Saved: ₹1,200, Contribution: ₹400/week (Mondays).
  - **Emergency Fund**: Target: ₹20,000, Saved: ₹5,000, Contribution: ₹500/month.
- `+ CREATE FUND` modal (Name, Icon, Target, Frequency, Contribution, Schedule).
- `+ Add Contribution` button on each card (records contribution and updates saved balance).
- Contribution history ledger.

### 4. 🎯 Budget Page (Monthly Spending Limits)
- Monthly budget summary: Total Budget, Spent, Remaining, Progress %.
- Category spending limits:
  - Food, Travel, Rent, EMI, Gym, Shopping, Entertainment, etc.
- 4 Visual Health States:
  - `0–70%`: **Healthy** (Neon Emerald Green)
  - `70–90%`: **Warning** (Amber)
  - `90–100%`: **Near Limit** (Orange)
  - `>100%`: **OVERSPENT** (Crimson Red)
- `+ Category Budget` modal.

### 5. 📅 Fixed Payments (Recurring Commitments)
- Tracks fixed monthly obligations:
  - Bike EMI (₹6,000), Rent (₹3,000), Gym (₹1,300), Subscription (₹500), RD (₹1,000), Home Expenses (₹500).
  - Due dates and amounts.
  - 1-click **Mark as Paid / Pending** toggle.

### 6. 📈 Reports Page (Financial Analytics)
- Interactive timeframe selector: `1 Month | 3 Months | 6 Months | 1 Year | All Time`.
- 4 Summary KPI widgets: Top Spending Category, Average Daily Spend, Highest Spending Day, Total Logged Transactions.
- Monthly Comparison Table: Month-by-month Income, Expenses, Net Saved, and Savings Rate %.

### 7. ⚙️ More Page (Settings Hub)
- User Profile: Edit display name and currency symbol (`₹`, `$`, `€`, `£`, `AED`).
- **📱 Android SMS Auto-Tracking Hub**:
  - Live toggle with in-app privacy disclosure modal before permissions.
  - Metrics cards: *Detected Today*, *Automatically Added*, *Waiting for Review*, *Ignored*.
  - Detection Modes: `Review Every Transaction` (Default), `Auto-add High Confidence`, `Auto-add All`, `Off`.
  - Historical SMS import (7, 30, 90 days, Custom) with duplicate prevention.
  - Pending review candidates queue with Approve, Edit, Ignore, and Delete actions.
- **🧪 Developer SMS Simulator**:
  - Paste arbitrary SMS strings or select from 10 pre-loaded test fixtures.
  - Instant parsing breakdown (Type, Amount, Merchant, Category, Payment Method, Confidence, Reference).
  - 1-click test transaction creation into Supabase/local candidate queue without needing a physical Android device or SIM card.
- **💳 Account Management**: Manage Cash, Bank Accounts, UPI, Credit/Debit cards, Wallets with last 4 digits and balances.
- Supabase Cloud Database Configuration & Connection Status.
- Full Data Sovereignty:
  - `💾 Export JSON Backup`
  - `📂 Import JSON Backup`
  - `🔄 Reset Initial Sample Data`
  - `🗑️ Clear All Expense Data`

---

## 📱 Android Native SMS Auto-Transaction Tracking

The application features an optional, privacy-first **Android SMS Transaction Tracking** system designed for Indian banking and UPI ecosystems.

### Architecture Flow
```
React UI / PWA
      ↓
Finance Service / State Store
      ↓
Android SMS Bridge (sms-bridge.js)
      ↓
Android SMS BroadcastReceiver (SmsReceiver.kt)
      ↓
Transaction Parser Engine (sms-parser.js / SmsParserEngine.kt)
      ↓
Duplicate Detector (Fingerprinting & UPI Reference)
      ↓
Candidate Review Queue / Auto-Add Engine
      ↓
Supabase Database (RLS user-isolated)
```

### Key Capabilities
- **🔒 Privacy First & Zero SMS Harvesting:**
  - Raw SMS messages are parsed entirely on-device and immediately discarded.
  - Only clean, structured financial transaction attributes (amount, merchant, date, type) are persisted.
  - Zero OTP, 2FA, password, marketing, or personal chat messages are processed or saved.
- **🇮🇳 Comprehensive Indian Banking & UPI Support:**
  - Detects `EXPENSE`, `INCOME` (Salary/Payroll), `REFUND` (credit adjustments), `TRANSFER` (account-to-account), and `FUND_CONTRIBUTION` (RD and Weekly Savings).
  - Handles currency formats: `₹500`, `Rs.500`, `Rs 500`, `INR 500`, `₹1,250.00`.
- **🧠 Category Prediction & Local Learning:**
  - Suggests categories automatically (e.g. Petrol Pump → Petrol / Travel, Swiggy → Food).
  - Learns user overrides and saves preferences in `sms_category_mappings` table.
- **🛡️ Duplicate Detection:**
  - Computes SHA/deterministic fingerprints using User ID, Amount, Timestamp, Merchant, Account Suffix, and Bank/UPI reference numbers.
- **📦 Android Native & Google Play Compliance:**
  - Complete native Android project in [`android/`](file:///r:/projects/daily-expense/android/) with Kotlin `BroadcastReceiver`, `Capacitor` bridge, and fallback web bridge.
  - Comprehensive compliance guide in [`GOOGLE_PLAY_SMS_POLICY.md`](file:///r:/projects/daily-expense/GOOGLE_PLAY_SMS_POLICY.md).
  - Android APK/AAB build instructions in [`ANDROID_BUILD_GUIDE.md`](file:///r:/projects/daily-expense/ANDROID_BUILD_GUIDE.md).

---

## 🚀 How to Run & Display on Phone

### 1. Start Dev Server (on PC)
In PowerShell:
```powershell
cd r:\projects\daily-expense
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```
The server will start on port `3000`:
- **Local PC**: `http://localhost:3000/`
- **On Phone**: `http://10.216.40.100:3000/`

### 2. View on Phone with Live Reload
1. Ensure your phone and PC are on the **same Wi-Fi network**.
2. Open Safari (iOS) or Chrome (Android) on your phone and navigate to:
   ```
   http://10.216.40.100:3000/
   ```
3. Whenever you save any changes in your code or styles, **your phone automatically refreshes live within 1 second**!
4. **Install as PWA**: Tap *Share / Options* → *"Add to Home Screen"* for a full-screen mobile app experience.

---

## 🗄️ Supabase Cloud Database Setup

To enable persistent cloud sync with Supabase:
1. Create a project at [supabase.com](https://supabase.com/).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and run the contents of [`supabase-schema.sql`](file:///r:/projects/daily-expense/supabase-schema.sql).
4. In the app, go to **More** → **Supabase Cloud Database**, and enter your Project URL and Anon Key.
5. All transactions and funds will now sync with cloud-backed Row Level Security!

