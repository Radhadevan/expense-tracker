# SpendFlow — Daily Expense Tracker & Month-End PDF Statement Generator

SpendFlow is a modern, privacy-first **Daily Expense Tracker & Month-End PDF Generator** built as an offline-ready Progressive Web App (PWA).

---

## 🌟 Key Features

1. **⚡ Fast Daily Expense Logging:**
   - Quick expense recording with date, amount, and description.
   - Quick-add increment chips (`+50`, `+100`, `+250`, `+500`, `+1,000`, `+2,000`).
   - 10 categorized badges: Food & Dining, Groceries, Transport & Fuel, Bills & Utilities, Shopping, Entertainment, Health & Medical, Education & Work, Rent & Living, Other.
   - Payment method tagging: UPI / GPay, Credit Card, Debit Card, Cash, Net Banking.

2. **📊 Live Monthly Financial Analytics:**
   - **Total Spent This Month** with real-time budget progress bar.
   - **Monthly Budget & Burn Rate**: Visual progress indicator (green <75%, amber 75-90%, red >90%).
   - **Daily Safe Allowance**: Calculates remaining safe spending per day for remaining days in the month.
   - **Daily Average Spend** and active spending days metrics.
   - **Category Breakdown**: Percentage bars and total volume per category.
   - **Payment Distribution**: Breakdown across UPI, cards, and cash.

3. **📄 Month-End PDF Statement Generator (`pdf-generator.js`):**
   - 100% offline, client-side PDF generation using `jsPDF` and `jsPDF-AutoTable`.
   - **Executive-Ready PDF Layout**:
     - Modern slate & emerald header with generated timestamp and statement period.
     - Recipient/account metadata.
     - 4-card Executive Summary KPI grid (Total Spent, Set Budget, Net Savings/Variance, Daily Average).
     - Category breakdown summary table with percentages.
     - Chronological, itemized transaction ledger table with dates, merchants, and amounts.
     - Clean multi-page pagination ("Page X of Y") with verification footers.
   - 1-click **Download PDF** and **Print / Save as PDF** options.

4. **📱 Offline PWA & Data Sovereignty:**
   - Works 100% offline without requiring servers or external accounts.
   - Stored in browser `localStorage`.
   - **Backup & Restore**: Export and Import full JSON backups at any time.
   - Installable on Mobile (iOS / Android) and Desktop (Chrome / Edge / Safari).

---

## 🚀 How to Open in Antigravity IDE

1. In Antigravity IDE, go to **File** → **Open Folder...**
2. Select `R:\projects\daily-expense`
3. Open `index.html` or run the dev server below.

---

## 🖥️ How to Run Locally

### Option A: Using the included PowerShell server
In terminal or PowerShell, run:
```powershell
cd R:\projects\daily-expense
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```
It will start on `http://localhost:5500/` and open in your default browser.

### Option B: Open directly in any browser
Double-click `index.html` in file explorer, or right click and choose **Open with** → Chrome / Edge / Firefox.

---

## 📁 Project Structure

```
R:\projects\daily-expense/
├── index.html          # Main application UI & semantic layout
├── style.css           # Obsidian & emerald design system
├── app.js              # State management, transactions CRUD & metrics
├── pdf-generator.js    # jsPDF & autoTable monthly statement generator
├── manifest.json       # PWA web manifest
├── service-worker.js   # Offline caching & service worker
├── icon.svg            # Vector app brand icon
├── serve.ps1           # 1-click local development web server
└── README.md           # Documentation & user guide
```
