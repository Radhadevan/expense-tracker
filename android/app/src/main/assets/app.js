/**
 * EXPENSE TRACKER — STANDALONE PRODUCTION-READY PERSONAL FINANCE APPLICATION
 * Built with React 18, Decimal-Safe Analytics, Offline Storage & Supabase Cloud Sync.
 * Production-ready financial architecture adhering strictly to Phase 1-4 requirements.
 */

(function () {
  'use strict';

  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const h = React.createElement;

  // --- STORAGE KEYS ---
  const STORAGE_KEYS = {
    PROFILE: 'exptrk_profile_v1',
    TRANSACTIONS: 'exptrk_transactions_v1',
    CATEGORIES: 'exptrk_categories_v1',
    FUNDS: 'exptrk_funds_v1', // Maintained for complete backward compatibility with Goals
    CONTRIBUTIONS: 'exptrk_contributions_v1',
    BUDGET: 'exptrk_budget_v1',
    CATEGORY_BUDGETS: 'exptrk_category_budgets_v1',
    RECURRING_PAYMENTS: 'exptrk_recurring_payments_v1',
    PAYMENT_METHODS: 'exptrk_payment_methods_v1',
    SUPABASE_CONFIG: 'exptrk_supabase_config_v1',
    ACCOUNTS: 'exptrk_accounts_v1',
    APP_LOCK: 'exptrk_app_lock_v1',
    DATA_SYNC: 'exptrk_data_sync_v1'
  };

  // --- GIT REPOSITORY CONFIGURATION (Direct Cloud Sync via GitHub & Raw CDN) ---
  const GITHUB_REPO = 'Radhadevan/expense-tracker';
  const GITHUB_BRANCH = 'main';
  const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/data/shared_store.json`;
  const GITHUB_COMMITS_API = `https://api.github.com/repos/${GITHUB_REPO}/commits?path=data/shared_store.json&page=1&per_page=1`;
  const LOCAL_STORE_URL = './data/shared_store.json';
  const DEFAULT_SYNC_HOST = 'http://10.216.40.100:3000';

  function getSyncServerBaseUrl() {
    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http')) {
      return window.location.origin;
    }
    try {
      const saved = localStorage.getItem('exptrk_sync_server_url');
      if (saved && saved.trim()) return saved.trim().replace(/\/$/, '');
    } catch {}
    return DEFAULT_SYNC_HOST;
  }

  // Multi-tier resilient Git data fetcher: supports GitHub Pages, jsDelivr CDN, GitHub REST API, and raw CDN
  async function fetchGitSharedData() {
    const cacheBuster = Date.now();
    const candidateUrls = [];

    // 1. Current Origin / Dynamic Relative Path (Guarantees correct path even without trailing slash)
    if (typeof window !== 'undefined' && window.location) {
      try {
        const origin = window.location.origin || '';
        const pathname = window.location.pathname || '/';
        const basePath = pathname.includes('/expense-tracker')
          ? '/expense-tracker/'
          : pathname.endsWith('/')
          ? pathname
          : pathname.slice(0, pathname.lastIndexOf('/') + 1);
        if (origin && origin.startsWith('http')) {
          candidateUrls.push(`${origin}${basePath}data/shared_store.json?_t=${cacheBuster}`);
        }
      } catch (_) {}
    }

    // 2. Canonical GitHub Pages URL
    candidateUrls.push(`https://radhadevan.github.io/expense-tracker/data/shared_store.json?_t=${cacheBuster}`);

    // 3. Ultra-fast jsDelivr GitHub CDN (CORS enabled, unblockable across mobile networks)
    candidateUrls.push(`https://cdn.jsdelivr.net/gh/Radhadevan/expense-tracker@main/data/shared_store.json?_t=${cacheBuster}`);

    // 4. Raw GitHub CDN
    candidateUrls.push(`https://raw.githubusercontent.com/Radhadevan/expense-tracker/main/data/shared_store.json?_t=${cacheBuster}`);

    // 5. Local Dev Server if running
    try {
      const base = getSyncServerBaseUrl();
      if (base && !base.includes('github.io')) {
        candidateUrls.push(`${base}/api/sync-data?_t=${cacheBuster}`);
      }
    } catch (_) {}

    // Try each direct JSON endpoint sequentially
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && (json.transactions || json.profile)) {
            console.log('[GitSync] Loaded data from:', url);
            return json;
          }
        }
      } catch (err) {
        console.warn('[GitSync] Endpoint unreachable:', url, err.message);
      }
    }

    // 6. Ultimate Fallback: Official GitHub REST API Contents (Decodes Base64)
    try {
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/data/shared_store.json?_t=${cacheBuster}`;
      const res = await fetch(apiUrl, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
        cache: 'no-store'
      });
      if (res.ok) {
        const fileObj = await res.json();
        if (fileObj && fileObj.content) {
          const decoded = decodeURIComponent(escape(atob(fileObj.content.replace(/\s/g, ''))));
          const json = JSON.parse(decoded);
          if (json && (json.transactions || json.profile)) {
            console.log('[GitSync] Loaded data via GitHub REST API contents');
            return json;
          }
        }
      }
    } catch (e) {
      console.warn('[GitSync] GitHub REST API fallback failed:', e.message);
    }

    return null;
  }

  // Universal Git commit pusher: commits data/shared_store.json directly to GitHub repository
  async function commitToGitHub(token, storeData) {
    if (!token) throw new Error('No GitHub Personal Access Token provided');
    const trimmedToken = token.trim();

    // 1. Fetch current file SHA from GitHub Contents API
    let sha = null;
    try {
      const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/shared_store.json?ref=${GITHUB_BRANCH}&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${trimmedToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }
    } catch (_) {}

    // 2. Base64 UTF-8 encoding
    const jsonStr = JSON.stringify(storeData, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonStr)));

    // 3. Commit PUT request
    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/shared_store.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${trimmedToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update expense tracker data (${new Date().toLocaleDateString('en-GB')}) [skip ci]`,
        content: base64Content,
        branch: GITHUB_BRANCH,
        sha: sha || undefined
      })
    });

    if (!putRes.ok) {
      const errObj = await putRes.json().catch(() => ({}));
      throw new Error(errObj.message || `GitHub API error: ${putRes.status}`);
    }
    return await putRes.json();
  }

  // --- CURRENCY OPTIONS ---
  const SUPPORTED_CURRENCIES = [
    { code: 'INR', symbol: '₹', label: '₹ INR (Indian Rupee)' },
    { code: 'USD', symbol: '$', label: '$ USD (US Dollar)' },
    { code: 'EUR', symbol: '€', label: '€ EUR (Euro)' },
    { code: 'GBP', symbol: '£', label: '£ GBP (British Pound)' },
    { code: 'AED', symbol: 'د.إ', label: 'د.إ AED (UAE Dirham)' },
    { code: 'QAR', symbol: 'ر.ق', label: 'ر.ق QAR (Qatari Riyal)' }
  ];

  // --- DEFAULT DATA SEEDS ---
  const DEFAULT_PROFILE = {
    id: 'user-default-1',
    name: 'Radhadevan',
    currency: '₹',
    currencyCode: 'INR'
  };

  const DEFAULT_CATEGORIES = [
    { id: 'cat-food', name: 'Food', type: 'EXPENSE', icon: '🍔', color: '#f59e0b' },
    { id: 'cat-travel', name: 'Petrol / Travel', type: 'EXPENSE', icon: '🚗', color: '#38bdf8' },
    { id: 'cat-rent', name: 'Rent', type: 'EXPENSE', icon: '🏠', color: '#ec4899' },
    { id: 'cat-emi', name: 'EMI', type: 'EXPENSE', icon: '💳', color: '#ef4444' },
    { id: 'cat-bills', name: 'Bills', type: 'EXPENSE', icon: '💡', color: '#a855f7' },
    { id: 'cat-shopping', name: 'Shopping', type: 'EXPENSE', icon: '🛍️', color: '#06b6d4' },
    { id: 'cat-entertainment', name: 'Entertainment', type: 'EXPENSE', icon: '🎬', color: '#f43f5e' },
    { id: 'cat-health', name: 'Health', type: 'EXPENSE', icon: '💊', color: '#14b8a6' },
    { id: 'cat-gym', name: 'Gym', type: 'EXPENSE', icon: '🏋️', color: '#84cc16' },
    { id: 'cat-subscriptions', name: 'Subscriptions', type: 'EXPENSE', icon: '📱', color: '#6366f1' },
    { id: 'cat-education', name: 'Education', type: 'EXPENSE', icon: '📚', color: '#d97706' },
    { id: 'cat-other-exp', name: 'Other', type: 'EXPENSE', icon: '📦', color: '#64748b' },

    { id: 'cat-salary', name: 'Salary', type: 'INCOME', icon: '💼', color: '#00f59b' },
    { id: 'cat-incentive', name: 'Incentive', type: 'INCOME', icon: '🎯', color: '#10b981' },
    { id: 'cat-freelance', name: 'Freelance', type: 'INCOME', icon: '💻', color: '#34d399' },
    { id: 'cat-bonus', name: 'Bonus', type: 'INCOME', icon: '🎁', color: '#22c55e' },
    { id: 'cat-other-inc', name: 'Other Income', type: 'INCOME', icon: '💰', color: '#4ade80' }
  ];

  const DEFAULT_PAYMENT_METHODS = ['UPI', 'Cash', 'Bank', 'Debit Card', 'Credit Card', 'Other'];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthStr = String(currentMonthNum).padStart(2, '0');
  const pad = (n) => String(n).padStart(2, '0');

  const INITIAL_TRANSACTIONS = [
    {
      id: 'txn-1',
      type: 'INCOME',
      categoryId: 'cat-salary',
      categoryName: 'Salary',
      categoryIcon: '💼',
      categoryColor: '#00f59b',
      amount: 25000,
      date: `${currentYear}-${currentMonthStr}-01`,
      time: '09:00',
      paymentMethod: 'Bank',
      description: 'Salary',
      notes: 'Monthly employer credit',
      source: 'MANUAL'
    },
    {
      id: 'txn-2',
      type: 'EXPENSE',
      categoryId: 'cat-emi',
      categoryName: 'EMI',
      categoryIcon: '💳',
      categoryColor: '#ef4444',
      amount: 6000,
      date: `${currentYear}-${currentMonthStr}-03`,
      time: '10:30',
      paymentMethod: 'Bank',
      description: 'Bike EMI',
      notes: 'Monthly EMI installment',
      source: 'MANUAL'
    },
    {
      id: 'txn-3',
      type: 'EXPENSE',
      categoryId: 'cat-rent',
      categoryName: 'Rent',
      categoryIcon: '🏠',
      categoryColor: '#ec4899',
      amount: 3000,
      date: `${currentYear}-${currentMonthStr}-04`,
      time: '11:00',
      paymentMethod: 'UPI',
      description: 'Rent',
      notes: 'Apartment rent transfer',
      source: 'MANUAL'
    },
    {
      id: 'txn-4',
      type: 'EXPENSE',
      categoryId: 'cat-gym',
      categoryName: 'Gym',
      categoryIcon: '🏋️',
      categoryColor: '#84cc16',
      amount: 1300,
      date: `${currentYear}-${currentMonthStr}-05`,
      time: '07:15',
      paymentMethod: 'UPI',
      description: 'Gym',
      notes: 'Monthly gym subscription pass',
      source: 'MANUAL'
    },
    {
      id: 'txn-5',
      type: 'EXPENSE',
      categoryId: 'cat-food',
      categoryName: 'Food',
      categoryIcon: '🍔',
      categoryColor: '#f59e0b',
      amount: 3330,
      date: `${currentYear}-${currentMonthStr}-04`,
      time: '14:00',
      paymentMethod: 'UPI',
      description: 'Dining & Groceries',
      notes: 'Weekly groceries and dinner',
      source: 'MANUAL'
    },
    {
      id: 'txn-6',
      type: 'EXPENSE',
      categoryId: 'cat-travel',
      categoryName: 'Petrol / Travel',
      categoryIcon: '🚗',
      categoryColor: '#38bdf8',
      amount: 500,
      date: `${currentYear}-${currentMonthStr}-${pad(now.getDate())}`,
      time: '12:45',
      paymentMethod: 'UPI',
      description: 'Petrol',
      notes: 'Fuel fill-up at Shell',
      source: 'SMS'
    },
    {
      id: 'txn-7',
      type: 'EXPENSE',
      categoryId: 'cat-food',
      categoryName: 'Food',
      categoryIcon: '🍔',
      categoryColor: '#f59e0b',
      amount: 250,
      date: `${currentYear}-${currentMonthStr}-${pad(now.getDate())}`,
      time: '19:15',
      paymentMethod: 'Cash',
      description: 'Alfaham + Tea',
      notes: 'Dinner with friends',
      source: 'SMS'
    },
    {
      id: 'txn-8',
      type: 'EXPENSE',
      categoryId: 'cat-food',
      categoryName: 'Food',
      categoryIcon: '🍔',
      categoryColor: '#f59e0b',
      amount: 120,
      date: `${currentYear}-${currentMonthStr}-${pad(now.getDate())}`,
      time: '08:30',
      paymentMethod: 'UPI',
      description: 'Puttu with Egg Curry',
      notes: 'Breakfast',
      source: 'MANUAL'
    }
  ];

  // Upgraded Goals (formerly Funds)
  const INITIAL_GOALS = [
    {
      id: 'fund-rd',
      name: 'RD (Recurring Deposit)',
      icon: '🏦',
      targetAmount: 12000,
      currentAmount: 1000,
      contributionAmount: 1000,
      frequency: 'MONTHLY',
      frequencyDay: '10',
      status: 'ACTIVE',
      startDate: `${currentYear}-01-01`
    },
    {
      id: 'fund-weekly',
      name: 'Weekly Saving Fund',
      icon: '💰',
      targetAmount: 1600,
      currentAmount: 1200,
      contributionAmount: 400,
      frequency: 'WEEKLY',
      frequencyDay: 'Monday',
      status: 'ACTIVE',
      startDate: `${currentYear}-09-01`
    },
    {
      id: 'fund-emergency',
      name: 'Emergency Fund',
      icon: '🛡️',
      targetAmount: 20000,
      currentAmount: 5000,
      contributionAmount: 500,
      frequency: 'MONTHLY',
      frequencyDay: '1st',
      status: 'ACTIVE',
      startDate: `${currentYear}-01-01`
    }
  ];

  const INITIAL_CONTRIBUTIONS = [
    {
      id: 'contrib-1',
      fundId: 'fund-rd',
      amount: 1000,
      date: `${currentYear}-${currentMonthStr}-02`,
      notes: 'Monthly RD installment'
    }
  ];

  const INITIAL_CATEGORY_BUDGETS = [
    { categoryId: 'cat-food', limitAmount: 5000 },
    { categoryId: 'cat-travel', limitAmount: 5000 },
    { categoryId: 'cat-shopping', limitAmount: 2000 },
    { categoryId: 'cat-entertainment', limitAmount: 1500 },
    { categoryId: 'cat-gym', limitAmount: 1500 },
    { categoryId: 'cat-rent', limitAmount: 3000 },
    { categoryId: 'cat-emi', limitAmount: 6000 }
  ];

  // Upgraded Recurring Payments Engine
  const INITIAL_RECURRING_PAYMENTS = [
    { id: 'rec-1', name: 'Bike EMI', amount: 6000, type: 'EXPENSE', categoryId: 'cat-emi', paymentAccount: 'Bank', frequency: 'MONTHLY', dueDay: 3, nextDueDate: `${currentYear}-${currentMonthStr}-03`, autoAdd: true, reminder: true, isPaid: true },
    { id: 'rec-2', name: 'Rent', amount: 3000, type: 'EXPENSE', categoryId: 'cat-rent', paymentAccount: 'UPI', frequency: 'MONTHLY', dueDay: 4, nextDueDate: `${currentYear}-${currentMonthStr}-04`, autoAdd: true, reminder: true, isPaid: true },
    { id: 'rec-3', name: 'Gym', amount: 1300, type: 'EXPENSE', categoryId: 'cat-gym', paymentAccount: 'UPI', frequency: 'MONTHLY', dueDay: 5, nextDueDate: `${currentYear}-${currentMonthStr}-05`, autoAdd: true, reminder: true, isPaid: true },
    { id: 'rec-4', name: 'Subscription', amount: 500, type: 'EXPENSE', categoryId: 'cat-subscriptions', paymentAccount: 'Credit Card', frequency: 'MONTHLY', dueDay: 18, nextDueDate: `${currentYear}-${currentMonthStr}-18`, autoAdd: false, reminder: true, isPaid: false },
    { id: 'rec-5', name: 'RD', amount: 1000, type: 'FUND_CONTRIBUTION', categoryId: 'cat-bills', paymentAccount: 'Bank', frequency: 'MONTHLY', dueDay: 10, nextDueDate: `${currentYear}-${currentMonthStr}-10`, autoAdd: true, reminder: true, isPaid: true },
    { id: 'rec-6', name: 'Home Expenses', amount: 500, type: 'EXPENSE', categoryId: 'cat-bills', paymentAccount: 'Cash', frequency: 'MONTHLY', dueDay: 25, nextDueDate: `${currentYear}-${currentMonthStr}-25`, autoAdd: false, reminder: true, isPaid: false }
  ];

  const DEFAULT_ACCOUNTS = [
    { id: 'acc-1', name: 'HDFC Bank Account', type: 'Bank', lastFour: '1234', balance: 15000 },
    { id: 'acc-2', name: 'Google Pay UPI', type: 'UPI', lastFour: '', balance: 0 },
    { id: 'acc-3', name: 'Cash in Hand', type: 'Cash', lastFour: '', balance: 2500 }
  ];

  // --- DECIMAL-SAFE MATH & FORMATTING HELPERS ---
  function safeRound(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function formatCurrency(amount, currency = '₹') {
    const rounded = safeRound(amount);
    const formatted = Math.abs(rounded).toLocaleString('en-IN', {
      maximumFractionDigits: 0
    });
    return `${amount < 0 ? '-' : ''}${currency}${formatted}`;
  }

  function getGreeting(name = 'Radhadevan') {
    const hr = new Date().getHours();
    let timeGreeting = 'Good Morning';
    if (hr >= 12 && hr < 17) timeGreeting = 'Good Afternoon';
    else if (hr >= 17) timeGreeting = 'Good Evening';
    return `${timeGreeting}, ${name} 👋`;
  }

  function getMonthName(monthIndex) {
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return names[monthIndex] || '';
  }

  // Calculate estimated completion date for savings goals
  function calculateGoalEstimatedCompletion(remaining, contributionAmount, frequency = 'MONTHLY') {
    if (remaining <= 0) return 'Completed! 🎉';
    if (!contributionAmount || contributionAmount <= 0) return 'Set contribution schedule';

    const periodsNeeded = Math.ceil(remaining / contributionAmount);
    const targetDate = new Date();

    if (frequency === 'WEEKLY') {
      targetDate.setDate(targetDate.getDate() + periodsNeeded * 7);
    } else if (frequency === 'YEARLY') {
      targetDate.setFullYear(targetDate.getFullYear() + periodsNeeded);
    } else {
      // Default Monthly
      targetDate.setMonth(targetDate.getMonth() + periodsNeeded);
    }

    return targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // --- CSV EXPORT GENERATOR (Requirement #7 & #21) ---
  function exportTransactionsCSV(transactions, currency) {
    const headers = ['Date', 'Time', 'Type', 'Description', 'Category', 'Amount', 'Payment Method', 'Notes'];
    const rows = transactions.map((t) => [
      `"${t.date || ''}"`,
      `"${t.time || ''}"`,
      `"${t.type || ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.categoryName || '').replace(/"/g, '""')}"`,
      t.amount || 0,
      `"${(t.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExpenseTracker_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- PDF REPORT EXPORT (Requirement #7 & #22) ---
  function exportPDFReport(transactions, stats, monthlyBudgetLimit, profile, viewMonth, viewYear) {
    if (typeof PdfGenerator !== 'undefined' && PdfGenerator.generateMonthlyReport) {
      const monthPrefix = `${viewYear}-${pad(viewMonth)}`;
      const monthTxns = transactions.filter((t) => t.date && t.date.startsWith(monthPrefix));
      PdfGenerator.generateMonthlyReport({
        monthKey: monthPrefix,
        monthLabel: `${getMonthName(viewMonth - 1)} ${viewYear}`,
        transactions: monthTxns,
        totalSpent: stats.expenses,
        budget: monthlyBudgetLimit,
        currency: profile.currency,
        userName: profile.name,
        includeCategories: true,
        includeLedger: true
      });
    } else {
      window.print();
    }
  }

  // --- TIME & FULL DATE DISPLAY HELPERS ---
  function formatTimeAMPM(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hr = parseInt(parts[0], 10);
    const min = parts[1];
    const ampm = hr >= 12 ? 'PM' : 'AM';
    hr = hr % 12;
    hr = hr ? hr : 12;
    return `${hr}:${min} ${ampm}`;
  }

  function formatFullDate(dateStr) {
    if (!dateStr) return { formatted: '', weekday: '', shortFormatted: '' };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { formatted: dateStr, weekday: '', shortFormatted: dateStr };
    const [y, m, d] = parts.map(Number);
    const dt = new Date(y, m - 1, d);
    const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = getMonthName(m - 1);
    return {
      formatted: `${pad(d)} ${monthName} ${y}`,
      weekday: dayName,
      shortFormatted: `${monthName} ${d}, ${y}`
    };
  }

  // --- SUPABASE TRANSACTION SYNC HELPER (Requirement #13) ---
  async function syncTransactionToSupabase(action, txn, config) {
    if (!config || !config.isConnected || !config.url || !config.anonKey || typeof window === 'undefined' || !window.supabase) {
      return;
    }
    try {
      const client = window.supabase.createClient(config.url, config.anonKey);
      if (action === 'INSERT') {
        await client.from('transactions').insert([{
          id: txn.id,
          type: txn.type,
          amount: txn.amount,
          date: txn.date,
          time: txn.time || '12:00',
          description: txn.description,
          notes: txn.notes || '',
          is_recurring: Boolean(txn.isRecurring),
          source: txn.source || 'MANUAL'
        }]);
      } else if (action === 'UPDATE') {
        await client.from('transactions').update({
          type: txn.type,
          amount: txn.amount,
          date: txn.date,
          time: txn.time || '12:00',
          description: txn.description,
          notes: txn.notes || '',
          is_recurring: Boolean(txn.isRecurring),
          updated_at: new Date().toISOString()
        }).eq('id', txn.id);
      } else if (action === 'DELETE') {
        await client.from('transactions').delete().eq('id', txn.id);
      }
    } catch (err) {
      console.warn('[Supabase Sync Error]', err);
    }
  }

  // ===========================================================================
  // SINGLE RELIABLE FINANCIAL CALCULATION ENGINE (Requirement #12)
  // Single reliable source of truth for all mathematical calculations.
  // ===========================================================================
  function calculateFinanceEngine({
    transactions,
    contributions,
    goals,
    recurringPayments,
    monthlyBudgetLimit,
    categoryBudgets,
    categories,
    year,
    month,
    currency = '₹'
  }) {
    const targetPrefix = `${year}-${pad(month)}`;
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    const nowDate = now.getDate();
    const todayStr = `${nowYear}-${pad(nowMonth)}-${pad(nowDate)}`;

    const daysInMonth = new Date(year, month, 0).getDate();
    const isCurrentMonth = year === nowYear && month === nowMonth;
    const passedDays = isCurrentMonth
      ? Math.min(daysInMonth, nowDate)
      : year < nowYear || (year === nowYear && month < nowMonth)
      ? daysInMonth
      : 0;
    const remainingDays = isCurrentMonth ? Math.max(1, daysInMonth - nowDate + 1) : daysInMonth;

    let income = 0;
    let expenses = 0;
    let todaySpend = 0;
    let todayCount = 0;
    let monthTxnCount = 0;
    const dayTotals = {};
    const catTotals = {};

    transactions.forEach((t) => {
      if (!t.date) return;
      if (t.date.startsWith(targetPrefix)) {
        monthTxnCount++;
        if (t.type === 'INCOME') {
          income += t.amount;
        } else if (t.type === 'EXPENSE') {
          expenses += t.amount;
          dayTotals[t.date] = (dayTotals[t.date] || 0) + t.amount;
          const cid = t.categoryId || 'cat-other-exp';
          catTotals[cid] = (catTotals[cid] || 0) + t.amount;
        }
        // Note: FUND_CONTRIBUTION and TRANSFER are NOT counted as ordinary expenses or income!
      }
      if (t.date === todayStr) {
        if (t.type === 'EXPENSE') todaySpend += t.amount;
        todayCount++;
      }
    });

    // Allocated goal contributions in this selected month
    let allocatedGoals = 0;
    contributions.forEach((c) => {
      if (c.date && c.date.startsWith(targetPrefix)) {
        allocatedGoals += c.amount;
      }
    });

    income = safeRound(income);
    expenses = safeRound(expenses);
    allocatedGoals = safeRound(allocatedGoals);
    todaySpend = safeRound(todaySpend);

    // Available Balance = Income - Expenses - Allocated Goals
    const availableBalance = safeRound(income - expenses - allocatedGoals);
    const savings = safeRound(income - expenses);
    const savingsPct = income > 0 ? safeRound((savings / income) * 100) : 0;

    // Monthly Budget
    const budgetUsedPct = monthlyBudgetLimit > 0 ? safeRound((expenses / monthlyBudgetLimit) * 100) : 0;
    const budgetRemaining = safeRound(Math.max(0, monthlyBudgetLimit - expenses));

    // SAFE TO SPEND CALCULATION (Requirement #1 & #10)
    // 1. Upcoming required payments due in remainder of this month:
    let upcomingBillsRestOfMonth = 0;
    recurringPayments.forEach((p) => {
      const dueDay = p.dueDay || 1;
      if (!p.isPaid && (isCurrentMonth ? dueDay >= nowDate : true)) {
        upcomingBillsRestOfMonth += p.amount || 0;
      }
    });

    // 2. Remaining planned goal contributions for this month:
    let remainingPlannedGoals = 0;
    goals.forEach((g) => {
      if (g.status !== 'ARCHIVED' && g.contributionAmount > 0) {
        let contributedThisMonth = 0;
        contributions.forEach((c) => {
          if (c.fundId === g.id && c.date && c.date.startsWith(targetPrefix)) {
            contributedThisMonth += c.amount;
          }
        });
        const pendingContrib = Math.max(0, g.contributionAmount - contributedThisMonth);
        remainingPlannedGoals += pendingContrib;
      }
    });

    const totalDeductions = safeRound(upcomingBillsRestOfMonth + remainingPlannedGoals);
    const netSpendable = safeRound(availableBalance - totalDeductions);
    const dailySafeToSpend = remainingDays > 0 ? safeRound(Math.max(0, netSpendable / remainingDays)) : 0;

    let safeStatus = 'healthy';
    let safeMessage = `You're on track for ${getMonthName(month - 1)}`;
    if (dailySafeToSpend < 200 || (monthlyBudgetLimit > 0 && expenses > monthlyBudgetLimit * 0.9)) {
      safeStatus = 'risky';
      safeMessage = "Slow down — you're approaching your monthly limit.";
    } else if (dailySafeToSpend < 500 || (monthlyBudgetLimit > 0 && expenses > monthlyBudgetLimit * 0.75)) {
      safeStatus = 'warning';
      safeMessage = 'Caution — pace your daily spending to stay within budget.';
    }

    // UPCOMING PAYMENTS (next 3 items sorted by due day)
    const sortedUpcoming = [...recurringPayments]
      .filter((p) => !p.isPaid)
      .sort((a, b) => (a.dueDay || 1) - (b.dueDay || 1))
      .slice(0, 3);

    // BUDGET FORECASTING (Requirement #5 & #11)
    const dailyBurnRate = passedDays > 0 ? safeRound(expenses / passedDays) : 0;
    const daysLeftInMonth = Math.max(0, daysInMonth - passedDays);
    const projectedTotal = passedDays > 0 ? safeRound(expenses + dailyBurnRate * daysLeftInMonth) : expenses;
    const forecastVariance = safeRound(projectedTotal - monthlyBudgetLimit);

    let forecastStatus = 'HEALTHY';
    let isLikelyToExceed = false;
    if (expenses > monthlyBudgetLimit) {
      forecastStatus = 'OVER BUDGET';
      isLikelyToExceed = true;
    } else if (projectedTotal > monthlyBudgetLimit) {
      forecastStatus = 'LIKELY TO EXCEED';
      isLikelyToExceed = true;
    } else if (projectedTotal >= monthlyBudgetLimit * 0.85) {
      forecastStatus = 'WARNING';
    } else {
      forecastStatus = 'HEALTHY';
    }

    // Highest Day & Category
    let highestDay = '—';
    let maxDay = 0;
    Object.entries(dayTotals).forEach(([d, a]) => {
      if (a > maxDay) {
        maxDay = a;
        const dt = new Date(d);
        highestDay = `${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${currency}${a.toLocaleString()})`;
      }
    });

    let highestCat = 'None';
    let maxCat = 0;
    Object.entries(catTotals).forEach(([cid, a]) => {
      if (a > maxCat) {
        maxCat = a;
        const found = categories.find((c) => c.id === cid);
        highestCat = found ? found.name : 'Other';
      }
    });

    const dailyAvg = passedDays > 0 ? safeRound(expenses / passedDays) : 0;

    return {
      income,
      expenses,
      allocatedGoals,
      availableBalance,
      savings,
      savingsPct,
      todaySpend,
      todayCount,
      budgetUsedPct,
      budgetRemaining,
      highestDay,
      highestCat,
      dailyAvg,
      monthTxnCount,
      safeToSpend: {
        daily: dailySafeToSpend,
        status: safeStatus,
        message: safeMessage,
        remainingDays,
        totalDeductions
      },
      upcomingPayments: sortedUpcoming,
      forecast: {
        projectedTotal,
        variance: forecastVariance,
        status: forecastStatus,
        isLikelyToExceed,
        dailyBurnRate
      }
    };
  }

  // --- MAIN APPLICATION COMPONENT ---
  function ExpenseTrackerApp() {
    // Persistent States
    const [profile, setProfile] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.PROFILE);
        return s ? JSON.parse(s) : DEFAULT_PROFILE;
      } catch {
        return DEFAULT_PROFILE;
      }
    });

    const [transactions, setTransactions] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        return s ? JSON.parse(s) : INITIAL_TRANSACTIONS;
      } catch {
        return INITIAL_TRANSACTIONS;
      }
    });

    const [categories, setCategories] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        return s ? JSON.parse(s) : DEFAULT_CATEGORIES;
      } catch {
        return DEFAULT_CATEGORIES;
      }
    });

    // Goals (maps to storage key FUNDS for complete backward compatibility)
    const [goals, setGoals] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.FUNDS);
        return s ? JSON.parse(s) : INITIAL_GOALS;
      } catch {
        return INITIAL_GOALS;
      }
    });

    const [contributions, setContributions] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS);
        return s ? JSON.parse(s) : INITIAL_CONTRIBUTIONS;
      } catch {
        return INITIAL_CONTRIBUTIONS;
      }
    });

    const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.BUDGET);
        return s ? JSON.parse(s).totalBudget : 25000;
      } catch {
        return 25000;
      }
    });

    const [categoryBudgets, setCategoryBudgets] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.CATEGORY_BUDGETS);
        return s ? JSON.parse(s) : INITIAL_CATEGORY_BUDGETS;
      } catch {
        return INITIAL_CATEGORY_BUDGETS;
      }
    });

    // Recurring Transactions Engine
    const [recurringPayments, setRecurringPayments] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.RECURRING_PAYMENTS);
        return s ? JSON.parse(s) : INITIAL_RECURRING_PAYMENTS;
      } catch {
        return INITIAL_RECURRING_PAYMENTS;
      }
    });

    const [accounts, setAccounts] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
        return s ? JSON.parse(s) : DEFAULT_ACCOUNTS;
      } catch {
        return DEFAULT_ACCOUNTS;
      }
    });

    // App Lock State (PIN Security)
    const [appLock, setAppLock] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.APP_LOCK);
        const parsed = s ? JSON.parse(s) : { enabled: false, pin: '' };
        return { ...parsed, isLocked: parsed.enabled };
      } catch {
        return { enabled: false, pin: '', isLocked: false };
      }
    });

    const [supabaseConfig, setSupabaseConfig] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
        return s ? JSON.parse(s) : { url: '', anonKey: '', isConnected: false, lastSync: null };
      } catch {
        return { url: '', anonKey: '', isConnected: false, lastSync: null };
      }
    });

    // Navigation & Viewing State (FUNDS renamed to GOALS)
    const [activeTab, setActiveTab] = useState(() => {
      if (typeof window !== 'undefined' && window.location.hash) {
        const h = window.location.hash.replace('#', '').toUpperCase();
        if (['HOME', 'TRANSACTIONS', 'GOALS', 'BUDGET', 'REPORTS', 'MORE', 'FIXED_PAYMENTS'].includes(h)) {
          return h;
        }
      }
      return 'HOME';
    });
    const [viewYear, setViewYear] = useState(currentYear);
    const [viewMonth, setViewMonth] = useState(currentMonthNum); // 1-indexed

    useEffect(() => {
      const handleHashChange = () => {
        if (window.location.hash) {
          const h = window.location.hash.replace('#', '').toUpperCase();
          if (['HOME', 'TRANSACTIONS', 'GOALS', 'BUDGET', 'REPORTS', 'MORE', 'FIXED_PAYMENTS'].includes(h)) {
            setActiveTab(h);
          }
        }
      };
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Calendar & Date Selection States (Requirements #1 - #12)
    const [calYear, setCalYear] = useState(currentYear);
    const [calMonth, setCalMonth] = useState(currentMonthNum);
    const [selectedDate, setSelectedDate] = useState(() => {
      return `${currentYear}-${currentMonthStr}-${pad(now.getDate())}`;
    });
    const [dateFilterMode, setDateFilterMode] = useState('CALENDAR'); // 'CALENDAR', 'TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'ALL'
    const touchStartRef = useRef(0);

    // Modals & UI States
    const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
    const [editingTxn, setEditingTxn] = useState(null);
    const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);
    const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [activeGoalForContrib, setActiveGoalForContrib] = useState(null);
    const [isCatBudgetModalOpen, setIsCatBudgetModalOpen] = useState(false);
    const [deletingTxnId, setDeletingTxnId] = useState(null);
    const [activeTxnForMenu, setActiveTxnForMenu] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const [reportsRange, setReportsRange] = useState('1M');
    const [isDataSyncOpen, setIsDataSyncOpen] = useState(false);
    const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
    const [isAppLockSetupOpen, setIsAppLockSetupOpen] = useState(false);
    const [developerMode, setDeveloperMode] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState(null);

    // Online / Offline State (Requirement #9)
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState('IDLE'); // 'IDLE', 'SYNCING', 'ERROR'

    // Live Cross-Device Sync State (Real-time updates across Phone & PC)
    const [liveSyncConnected, setLiveSyncConnected] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const isApplyingIncomingSyncRef = useRef(false);
    const lastSyncedTicksRef = useRef(0);
    const pushTimeoutRef = useRef(null);
    const isInitialMountRef = useRef(true);
    const transactionsRef = useRef(transactions);
    transactionsRef.current = transactions;

    // Filter states on Transactions Page
    const [txnSearch, setTxnSearch] = useState('');
    const [txnTypeFilter, setTxnTypeFilter] = useState('ALL');
    const [txnCatFilter, setTxnCatFilter] = useState('ALL');
    const [txnSort, setTxnSort] = useState('NEWEST');

    // Show Toast Helper
    const showToast = useCallback((msg) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    }, []);

    // Monitor Online status
    useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }, []);

    // Save Persistent States to LocalStorage
    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    }, [profile]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }, [transactions]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(goals));
    }, [goals]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(contributions));
    }, [contributions]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify({ totalBudget: monthlyBudgetLimit }));
    }, [monthlyBudgetLimit]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.CATEGORY_BUDGETS, JSON.stringify(categoryBudgets));
    }, [categoryBudgets]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.RECURRING_PAYMENTS, JSON.stringify(recurringPayments));
    }, [recurringPayments]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    }, [accounts]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.APP_LOCK, JSON.stringify({ enabled: appLock.enabled, pin: appLock.pin }));
    }, [appLock.enabled, appLock.pin]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(supabaseConfig));
    }, [supabaseConfig]);

    // --- GIT-FIRST DATA SYNCHRONIZATION ENGINE ---
    // Synchronizes financial data directly through the Git repository (data/shared_store.json)
    // Supports GitHub Pages, raw.githubusercontent CDN, and direct mobile-to-Git commits

    const applyIncomingData = useCallback((data, isManual = false) => {
      if (!data) return;

      const remoteTxns = Array.isArray(data.transactions) ? data.transactions : [];
      if (remoteTxns.length === 0 && !data.profile && !data.goals) return;

      // Canonical Git Sync: Git transactions are the single source of truth!
      // This eliminates discrepancies and guarantees laptop and mobile have identical data.
      const finalTxns = remoteTxns;

      isApplyingIncomingSyncRef.current = true;
      setTransactions(finalTxns);
      if (data.goals) setGoals(data.goals);
      if (data.contributions) setContributions(data.contributions);
      if (data.monthlyBudgetLimit !== undefined) setMonthlyBudgetLimit(data.monthlyBudgetLimit);
      if (data.categoryBudgets) setCategoryBudgets(data.categoryBudgets);
      if (data.recurringPayments) setRecurringPayments(data.recurringPayments);
      if (data.accounts) setAccounts(data.accounts);
      if (data.categories) setCategories(data.categories);
      if (data.profile) setProfile(data.profile);

      lastSyncedTicksRef.current = data.timestamp || Date.now();
      setLiveSyncConnected(true);
      setLastSyncTime(new Date());

      setTimeout(() => {
        isApplyingIncomingSyncRef.current = false;
      }, 400);

      if (isManual) {
        showToast(`🟢 Synced with Git (${finalTxns.length} transactions)`);
      }
    }, [showToast]);

    const pullFromGit = useCallback(async (isManual = false) => {
      try {
        if (isManual) showToast('Fetching latest data from Git repository...');
        const data = await fetchGitSharedData();
        if (data && (data.transactions || data.profile)) {
          applyIncomingData(data, isManual);
          return true;
        } else {
          if (isManual) showToast('⚠️ Unable to reach Git data file.');
          return false;
        }
      } catch (err) {
        console.warn('[GitSync] Pull error:', err);
        if (isManual) showToast('⚠️ Git sync error: ' + (err.message || 'Network issue'));
        return false;
      }
    }, [applyIncomingData, showToast]);

    const pushCurrentStateToServer = useCallback(async (customTxns) => {
      if (isApplyingIncomingSyncRef.current) return;

      const payload = {
        timestamp: Date.now(),
        profile,
        transactions: customTxns || transactions,
        categories,
        goals,
        contributions,
        monthlyBudgetLimit,
        categoryBudgets,
        recurringPayments,
        accounts,
        appLock: { enabled: appLock.enabled, pin: appLock.pin }
      };

      // 1. If running with local dev server, write to disk
      try {
        const base = getSyncServerBaseUrl();
        if (base && !base.includes('github.io')) {
          const res = await fetch(base + '/api/sync-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const json = await res.json();
            lastSyncedTicksRef.current = json.timestamp || Date.now();
            setLiveSyncConnected(true);
            setLastSyncTime(new Date());
          }
        }
      } catch (_) {}

      // 2. If GitHub PAT is stored, commit directly to GitHub repository
      try {
        const ghToken = localStorage.getItem('exptrk_github_pat');
        if (ghToken && ghToken.trim()) {
          await commitToGitHub(ghToken.trim(), payload);
          lastSyncedTicksRef.current = payload.timestamp;
          setLiveSyncConnected(true);
          setLastSyncTime(new Date());
        }
      } catch (err) {
        console.warn('[GitSync] Push warning:', err);
      }
    }, [profile, transactions, categories, goals, contributions, monthlyBudgetLimit, categoryBudgets, recurringPayments, accounts, appLock]);

    const checkRemoteUpdates = useCallback(async () => {
      if (isApplyingIncomingSyncRef.current) return;
      try {
        const data = await fetchGitSharedData();
        if (data && (data.transactions || data.profile)) {
          setLiveSyncConnected(true);
          if (data.timestamp && data.timestamp > lastSyncedTicksRef.current) {
            applyIncomingData(data, false);
          }
        }
      } catch (err) {
        // network drop, maintain local state
      }
    }, [applyIncomingData]);

    // Initial mount hydration: sync shared store directly from Git
    useEffect(() => {
      let isMounted = true;
      async function initialSync() {
        try {
          const data = await fetchGitSharedData();
          if (!isMounted) return;
          if (data && (data.transactions || data.profile)) {
            applyIncomingData(data, false);
          }
        } catch (_) {}
      }
      initialSync();
      return () => { isMounted = false; };
    }, [applyIncomingData]);

    // Auto-push local modifications to dev server / Git if token configured (debounced 500ms)
    useEffect(() => {
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        return;
      }
      if (isApplyingIncomingSyncRef.current) return;

      if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
      pushTimeoutRef.current = setTimeout(() => {
        pushCurrentStateToServer();
      }, 500);

      return () => {
        if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
      };
    }, [
      profile,
      transactions,
      categories,
      goals,
      contributions,
      monthlyBudgetLimit,
      categoryBudgets,
      recurringPayments,
      accounts,
      appLock,
      pushCurrentStateToServer
    ]);

    // Git poller: checks for Git updates every 4.5s + on mobile screen unlock / app focus
    useEffect(() => {
      const interval = setInterval(checkRemoteUpdates, 4500);
      const onFocus = () => checkRemoteUpdates();
      const onVisibility = () => {
        if (!document.hidden) checkRemoteUpdates();
      };

      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisibility);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }, [checkRemoteUpdates]);

    // AUTO-ADD RECURRING TRANSACTIONS ENGINE (Requirement #3)
    useEffect(() => {
      const todayStr = `${currentYear}-${pad(currentMonthNum)}-${pad(now.getDate())}`;
      const currentMonthPrefix = `${currentYear}-${pad(currentMonthNum)}`;

      let hasNewTxns = false;
      const newTxnsToInsert = [];
      const updatedRecurring = recurringPayments.map((p) => {
        if (p.autoAdd && !p.isPaid && (p.dueDay || 1) <= now.getDate()) {
          // Check for existing duplicate transaction for this month
          const alreadyCreated = transactions.some(
            (t) => t.date && t.date.startsWith(currentMonthPrefix) && t.description === p.name && t.amount === p.amount
          );

          if (!alreadyCreated) {
            hasNewTxns = true;
            newTxnsToInsert.push({
              id: 'txn-rec-' + p.id + '-' + currentYear + '-' + currentMonthNum,
              type: p.type || 'EXPENSE',
              categoryId: p.categoryId || 'cat-bills',
              categoryName: p.name,
              categoryIcon: '🔁',
              categoryColor: '#00f59b',
              amount: p.amount,
              date: todayStr,
              time: '09:00',
              paymentMethod: p.paymentAccount || 'Bank',
              description: p.name,
              notes: 'Auto-recorded recurring transaction',
              isRecurring: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
          return { ...p, isPaid: true, lastProcessedDate: todayStr };
        }
        return p;
      });

      if (hasNewTxns && newTxnsToInsert.length > 0) {
        setTransactions((prev) => [...newTxnsToInsert, ...prev]);
        setRecurringPayments(updatedRecurring);
        showToast(`Auto-recorded ${newTxnsToInsert.length} due recurring transaction(s)!`);
      }
    }, []);

    // Month Navigation Handlers
    const handlePrevMonth = () => {
      if (viewMonth === 1) {
        setViewMonth(12);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    };

    const handleNextMonth = () => {
      if (viewMonth === 12) {
        setViewMonth(1);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    };

    const handleJumpToday = () => {
      setViewYear(currentYear);
      setViewMonth(currentMonthNum);
    };

    // Calendar Month Navigation Handlers (Requirements #1 & #8)
    const handleCalPrevMonth = () => {
      if (calMonth === 1) {
        setCalMonth(12);
        setCalYear((y) => y - 1);
      } else {
        setCalMonth((m) => m - 1);
      }
    };

    const handleCalNextMonth = () => {
      if (calMonth === 12) {
        setCalMonth(1);
        setCalYear((y) => y + 1);
      } else {
        setCalMonth((m) => m + 1);
      }
    };

    const handleCalJumpToday = () => {
      const todayDateStr = `${currentYear}-${currentMonthStr}-${pad(now.getDate())}`;
      setCalYear(currentYear);
      setCalMonth(currentMonthNum);
      setSelectedDate(todayDateStr);
      setDateFilterMode('CALENDAR');
    };

    // Touch Swipe Navigation for Calendar (Requirement #11)
    const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        touchStartRef.current = e.touches[0].clientX;
      }
    };

    const handleTouchEnd = (e) => {
      if (e.changedTouches && e.changedTouches[0]) {
        const deltaX = e.changedTouches[0].clientX - touchStartRef.current;
        if (deltaX > 45) {
          handleCalPrevMonth();
        } else if (deltaX < -45) {
          handleCalNextMonth();
        }
      }
    };

    // Dynamic indicators for every date: Green = income, Red = expense, Both = green + red dots (Requirement #10)
    const dateIndicators = useMemo(() => {
      const map = {};
      transactions.forEach((t) => {
        if (!t.date) return;
        if (!map[t.date]) {
          map[t.date] = { hasIncome: false, hasExpense: false, count: 0 };
        }
        map[t.date].count++;
        if (t.type === 'INCOME') map[t.date].hasIncome = true;
        if (t.type === 'EXPENSE' || t.type === 'REFUND') map[t.date].hasExpense = true;
      });
      return map;
    }, [transactions]);

    // 7-column calendar day cells for current calYear and calMonth (Requirement #1)
    const calCells = useMemo(() => {
      const firstDayObj = new Date(calYear, calMonth - 1, 1);
      const daysInCalMonth = new Date(calYear, calMonth, 0).getDate();
      const startingDay = (firstDayObj.getDay() + 6) % 7; // Mon = 0..Sun = 6
      const daysInPrevMonth = new Date(calYear, calMonth - 1, 0).getDate();

      const cells = [];
      for (let i = startingDay - 1; i >= 0; i--) {
        const dNum = daysInPrevMonth - i;
        let prevM = calMonth - 1;
        let prevY = calYear;
        if (prevM < 1) { prevM = 12; prevY--; }
        const dStr = `${prevY}-${pad(prevM)}-${pad(dNum)}`;
        cells.push({ day: dNum, dateStr: dStr, isCurrentMonth: false, year: prevY, month: prevM });
      }
      for (let d = 1; d <= daysInCalMonth; d++) {
        const dStr = `${calYear}-${pad(calMonth)}-${pad(d)}`;
        cells.push({ day: d, dateStr: dStr, isCurrentMonth: true, year: calYear, month: calMonth });
      }
      const remainingSlots = (7 - (cells.length % 7)) % 7;
      for (let n = 1; n <= remainingSlots; n++) {
        let nextM = calMonth + 1;
        let nextY = calYear;
        if (nextM > 12) { nextM = 1; nextY++; }
        const dStr = `${nextY}-${pad(nextM)}-${pad(n)}`;
        cells.push({ day: n, dateStr: dStr, isCurrentMonth: false, year: nextY, month: nextM });
      }
      return cells;
    }, [calYear, calMonth]);

    const selectedDateInfo = useMemo(() => formatFullDate(selectedDate), [selectedDate]);

    // Selected Date Summary dynamic calculations (Requirement #2)
    const dateStats = useMemo(() => {
      let inc = 0;
      let exp = 0;
      transactions.forEach((t) => {
        if (t.date === selectedDate) {
          if (t.type === 'INCOME') inc += t.amount;
          else if (t.type === 'EXPENSE' || t.type === 'REFUND') exp += t.amount;
        }
      });
      inc = safeRound(inc);
      exp = safeRound(exp);
      const net = safeRound(inc - exp);
      return { income: inc, expenses: exp, net };
    }, [transactions, selectedDate]);

    // Filtered Transactions for Transactions & Calendar View (Requirements #1, #2, #3, #9)
    const displayedTxns = useMemo(() => {
      const todayDateStr = `${currentYear}-${currentMonthStr}-${pad(now.getDate())}`;

      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const yesterdayDateStr = `${yDate.getFullYear()}-${pad(yDate.getMonth() + 1)}-${pad(yDate.getDate())}`;

      // This week: Monday to Sunday
      const curr = new Date();
      const dayOfWeek = curr.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(curr);
      monday.setDate(curr.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const mondayStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      const sundayStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

      const list = transactions.filter((t) => {
        // 1. Date filter mode
        if (dateFilterMode === 'CALENDAR') {
          if (t.date !== selectedDate) return false;
        } else if (dateFilterMode === 'TODAY') {
          if (t.date !== todayDateStr) return false;
        } else if (dateFilterMode === 'YESTERDAY') {
          if (t.date !== yesterdayDateStr) return false;
        } else if (dateFilterMode === 'THIS_WEEK') {
          if (!t.date || t.date < mondayStr || t.date > sundayStr) return false;
        } else if (dateFilterMode === 'THIS_MONTH') {
          const prefix = `${calYear}-${pad(calMonth)}`;
          if (!t.date || !t.date.startsWith(prefix)) return false;
        }
        // dateFilterMode === 'ALL' matches all dates

        // 2. Search query filter
        if (txnSearch.trim()) {
          const q = txnSearch.trim().toLowerCase();
          const matchDesc = t.description && t.description.toLowerCase().includes(q);
          const matchNotes = t.notes && t.notes.toLowerCase().includes(q);
          const matchCat = t.categoryName && t.categoryName.toLowerCase().includes(q);
          const matchPay = t.paymentMethod && t.paymentMethod.toLowerCase().includes(q);
          const matchAmt = String(t.amount || '').includes(q);
          if (!matchDesc && !matchNotes && !matchCat && !matchPay && !matchAmt) return false;
        }

        // 3. Type filter
        if (txnTypeFilter !== 'ALL' && t.type !== txnTypeFilter) return false;

        // 4. Category filter
        if (txnCatFilter !== 'ALL' && t.categoryId !== txnCatFilter) return false;

        return true;
      });

      // Sort
      list.sort((a, b) => {
        if (txnSort === 'NEWEST') {
          if (a.date !== b.date) return b.date > a.date ? 1 : -1;
          const aTime = a.time || '00:00';
          const bTime = b.time || '00:00';
          return bTime > aTime ? 1 : -1;
        }
        if (txnSort === 'OLDEST') {
          if (a.date !== b.date) return a.date > b.date ? 1 : -1;
          const aTime = a.time || '00:00';
          const bTime = b.time || '00:00';
          return aTime > bTime ? 1 : -1;
        }
        if (txnSort === 'HIGHEST') return b.amount - a.amount;
        if (txnSort === 'LOWEST') return a.amount - b.amount;
        return 0;
      });

      return list;
    }, [transactions, dateFilterMode, selectedDate, calYear, calMonth, txnSearch, txnTypeFilter, txnCatFilter, txnSort]);

    // Calculate Comprehensive Financial Engine
    const stats = useMemo(() => {
      return calculateFinanceEngine({
        transactions,
        contributions,
        goals,
        recurringPayments,
        monthlyBudgetLimit,
        categoryBudgets,
        categories,
        year: viewYear,
        month: viewMonth,
        currency: profile.currency
      });
    }, [transactions, contributions, goals, recurringPayments, monthlyBudgetLimit, categoryBudgets, categories, viewYear, viewMonth, profile.currency]);

    // Category Breakdown for Spending Chart
    const categoryBreakdown = useMemo(() => {
      const targetPrefix = `${viewYear}-${pad(viewMonth)}`;
      const map = {};
      let total = 0;

      transactions.forEach((t) => {
        if (t.type === 'EXPENSE' && t.date && t.date.startsWith(targetPrefix)) {
          total += t.amount;
          const cid = t.categoryId || 'cat-other-exp';
          if (!map[cid]) {
            const cat = categories.find((c) => c.id === cid) || { name: 'Other', icon: '📦', color: '#64748b' };
            map[cid] = { id: cid, name: cat.name, icon: cat.icon, color: cat.color, amount: 0 };
          }
          map[cid].amount += t.amount;
        }
      });

      const list = Object.values(map);
      if (total > 0) {
        list.forEach((item) => {
          item.percentage = safeRound((item.amount / total) * 100);
        });
      }
      list.sort((a, b) => b.amount - a.amount);
      return { list, total: safeRound(total) };
    }, [transactions, categories, viewYear, viewMonth]);

    // Save or Edit Transaction (Requirements #4, #5, #6, #13, #14, #15, #16)
    const handleSaveTransaction = (txnData) => {
      if (editingTxn) {
        // Goal contribution adjustment
        if (editingTxn.type === 'FUND_CONTRIBUTION' && editingTxn.goalId) {
          const delta = (txnData.type === 'FUND_CONTRIBUTION' ? txnData.amount : 0) - editingTxn.amount;
          if (delta !== 0) {
            setGoals((prev) =>
              prev.map((g) => (g.id === editingTxn.goalId ? { ...g, currentAmount: safeRound(Math.max(0, g.currentAmount + delta)) } : g))
            );
          }
        } else if (txnData.type === 'FUND_CONTRIBUTION' && txnData.goalId) {
          setGoals((prev) =>
            prev.map((g) => (g.id === txnData.goalId ? { ...g, currentAmount: safeRound(g.currentAmount + txnData.amount) } : g))
          );
        }

        // Recurring template update if requested
        if (txnData.updateRecurringTemplate && editingTxn.isRecurring) {
          setRecurringPayments((prev) =>
            prev.map((p) => (p.name === editingTxn.description ? { ...p, amount: txnData.amount } : p))
          );
        }

        // Preserve source & metadata
        const updatedTxn = {
          ...editingTxn,
          ...txnData,
          source: editingTxn.source || 'MANUAL',
          isEdited: editingTxn.source === 'SMS' ? true : editingTxn.isEdited,
          updatedAt: new Date().toISOString()
        };

        setTransactions((prev) =>
          prev.map((t) => (t.id === editingTxn.id ? updatedTxn : t))
        );

        // Sync with Supabase (Requirement #13)
        syncTransactionToSupabase('UPDATE', updatedTxn, supabaseConfig);

        // Date Editing (Requirement #5): Automatically move to and display the new date
        if (txnData.date) {
          setSelectedDate(txnData.date);
          const [y, m] = txnData.date.split('-').map(Number);
          setCalYear(y);
          setCalMonth(m);
        }

        showToast('Transaction updated');
      } else {
        const newTxn = {
          id: 'txn-' + Date.now(),
          source: 'MANUAL',
          ...txnData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setTransactions((prev) => [newTxn, ...prev]);

        // If Goal contribution
        if (txnData.type === 'FUND_CONTRIBUTION' && txnData.goalId) {
          handleAddContribution(txnData.goalId, txnData.amount, txnData.description || 'Goal allocation');
        }

        // Sync with Supabase
        syncTransactionToSupabase('INSERT', newTxn, supabaseConfig);

        if (txnData.date) {
          setSelectedDate(txnData.date);
          const [y, m] = txnData.date.split('-').map(Number);
          setCalYear(y);
          setCalMonth(m);
        }

        showToast('Transaction recorded successfully!');
      }
      setIsAddTxnOpen(false);
      setEditingTxn(null);
    };

    // Duplicate Transaction
    const handleDuplicateTxn = (txn) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().slice(0, 5);
      const dup = {
        ...txn,
        id: 'txn-' + Date.now(),
        date: todayStr,
        time: timeStr,
        source: 'MANUAL',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setTransactions((prev) => [dup, ...prev]);
      syncTransactionToSupabase('INSERT', dup, supabaseConfig);
      showToast(`Duplicated: ${dup.description}`);
    };

    // Delete Transaction (Requirement #7)
    const handleDeleteTxn = (id) => {
      const target = transactions.find((t) => t.id === id);
      if (target) {
        if (target.type === 'FUND_CONTRIBUTION' && target.goalId) {
          setGoals((prev) =>
            prev.map((g) => (g.id === target.goalId ? { ...g, currentAmount: safeRound(Math.max(0, g.currentAmount - target.amount)) } : g))
          );
        }
        syncTransactionToSupabase('DELETE', target, supabaseConfig);
      }

      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setDeletingTxnId(null);
      setActiveTxnForMenu(null);
      setIsAddTxnOpen(false);
      setEditingTxn(null);
      showToast('Transaction deleted');
    };

    // Goal Handlers (Create, Edit, Archive, Contribute)
    const handleSaveGoal = (goalData) => {
      if (editingGoal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === editingGoal.id ? { ...g, ...goalData, updatedAt: new Date().toISOString() } : g))
        );
        showToast('Savings goal updated!');
      } else {
        const newGoal = {
          id: 'fund-' + Date.now(),
          ...goalData,
          currentAmount: parseFloat(goalData.currentAmount) || 0,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setGoals((prev) => [...prev, newGoal]);
        showToast(`Created goal: ${goalData.name}`);
      }
      setIsAddGoalOpen(false);
      setEditingGoal(null);
    };

    const handleArchiveGoal = (id) => {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id === id) {
            const nextStatus = g.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
            showToast(`Goal ${nextStatus === 'ARCHIVED' ? 'archived' : 'restored'}.`);
            return { ...g, status: nextStatus };
          }
          return g;
        })
      );
    };

    // Add Contribution to Goal (Never counted as ordinary expense)
    const handleAddContribution = (goalId, amount, notes = '') => {
      const numAmt = safeRound(parseFloat(amount));
      if (isNaN(numAmt) || numAmt <= 0) return;

      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, currentAmount: safeRound(g.currentAmount + numAmt) } : g))
      );

      const newContrib = {
        id: 'contrib-' + Date.now(),
        fundId: goalId,
        amount: numAmt,
        date: new Date().toISOString().split('T')[0],
        notes: notes || 'Goal contribution',
        createdAt: new Date().toISOString()
      };
      setContributions((prev) => [newContrib, ...prev]);
      setActiveGoalForContrib(null);
      showToast(`Added ${profile.currency}${numAmt} to goal!`);
    };

    // Category Budget Handler
    const handleSaveCatBudget = (catId, limit) => {
      const num = safeRound(parseFloat(limit));
      if (isNaN(num) || num <= 0) return;
      setCategoryBudgets((prev) => {
        const filtered = prev.filter((cb) => cb.categoryId !== catId);
        return [...filtered, { categoryId: catId, limitAmount: num }];
      });
      setIsCatBudgetModalOpen(false);
      showToast('Category budget limit saved!');
    };

    // Toggle Recurring Payment Status
    const handleToggleRecurringPayment = (id) => {
      setRecurringPayments((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const newStatus = !p.isPaid;
            showToast(`${p.name} marked as ${newStatus ? 'Paid' : 'Pending'}`);
            return { ...p, isPaid: newStatus };
          }
          return p;
        })
      );
    };

    // Save or Edit Recurring Payment Entry
    const handleSaveRecurringPayment = (paymentData) => {
      if (editingRecurring) {
        setRecurringPayments((prev) =>
          prev.map((r) => (r.id === editingRecurring.id ? { ...r, ...paymentData } : r))
        );
        setIsAddRecurringOpen(false);
        setEditingRecurring(null);
        showToast(`Updated recurring obligation: ${paymentData.name}`);
      } else {
        const newRec = {
          id: 'rec-' + Date.now(),
          ...paymentData,
          isPaid: false
        };
        setRecurringPayments((prev) => [...prev, newRec]);
        setIsAddRecurringOpen(false);
        showToast(`Added recurring obligation: ${newRec.name}`);
      }
    };

    // Delete Recurring Payment Entry
    const handleDeleteRecurringPayment = (id) => {
      setRecurringPayments((prev) => prev.filter((r) => r.id !== id));
      setIsAddRecurringOpen(false);
      setEditingRecurring(null);
      showToast('Deleted recurring obligation.');
    };

    // Reset Sample Data (Developer Mode Only)
    const handleResetSampleData = () => {
      if (confirm('Reset to initial sample data? Your custom additions will be replaced with clean demo records.')) {
        setTransactions(INITIAL_TRANSACTIONS);
        setGoals(INITIAL_GOALS);
        setContributions(INITIAL_CONTRIBUTIONS);
        setMonthlyBudgetLimit(25000);
        setCategoryBudgets(INITIAL_CATEGORY_BUDGETS);
        setRecurringPayments(INITIAL_RECURRING_PAYMENTS);
        setProfile(DEFAULT_PROFILE);
        showToast('Reset to initial sample data successfully!');
      }
    };

    // Export JSON Backup
    const handleExportBackup = () => {
      const backup = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        profile,
        transactions,
        categories,
        goals,
        contributions,
        monthlyBudgetLimit,
        categoryBudgets,
        recurringPayments,
        accounts
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ExpenseTracker_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup JSON downloaded!');
    };

    // Import JSON Backup
    const handleImportBackup = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.profile) setProfile(parsed.profile);
          if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
          if (Array.isArray(parsed.categories)) setCategories(parsed.categories);
          if (Array.isArray(parsed.goals)) setGoals(parsed.goals);
          else if (Array.isArray(parsed.funds)) setGoals(parsed.funds);
          if (Array.isArray(parsed.contributions)) setContributions(parsed.contributions);
          if (parsed.monthlyBudgetLimit) setMonthlyBudgetLimit(parsed.monthlyBudgetLimit);
          if (Array.isArray(parsed.categoryBudgets)) setCategoryBudgets(parsed.categoryBudgets);
          if (Array.isArray(parsed.recurringPayments)) setRecurringPayments(parsed.recurringPayments);
          else if (Array.isArray(parsed.fixedPayments)) setRecurringPayments(parsed.fixedPayments);
          if (Array.isArray(parsed.accounts)) setAccounts(parsed.accounts);
          showToast('Backup restored successfully!');
        } catch (err) {
          alert('Failed to parse JSON backup file: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    // Clear All Data (Danger Zone - 2 step)
    const handleClearAll = () => {
      setTransactions([]);
      setContributions([]);
      setIsDangerZoneOpen(false);
      showToast('All transaction and contribution records erased.');
    };

    // App Lock PIN Verification
    const handlePinInput = (digit) => {
      setPinAttempt((prev) => {
        const next = prev + digit;
        if (next.length === 4) {
          if (next === appLock.pin) {
            setAppLock((l) => ({ ...l, isLocked: false }));
            setPinAttempt('');
          } else {
            alert('Incorrect PIN. Please try again.');
            return '';
          }
        }
        return next;
      });
    };
    const [pinAttempt, setPinAttempt] = useState('');

    // =========================================================================
    // 1. HOME VIEW (Requirement #1)
    // =========================================================================
    const renderHomeView = () => {
      const recentTxns = transactions.slice(0, 5);

      return h('div', { className: 'page-view' },
        // Main Available Balance Card
        h('div', { className: 'balance-card' },
          h('div', { className: 'balance-header' },
            h('span', { className: 'balance-label' }, 'AVAILABLE BALANCE'),
            h('span', { className: 'savings-badge' }, `${stats.savingsPct}% Saved`)
          ),
          h('div', { className: 'balance-amount' }, formatCurrency(stats.availableBalance, profile.currency)),
          h('div', { className: 'balance-sub' },
            'OF ',
            h('span', null, formatCurrency(stats.income, profile.currency)),
            ' INCOME'
          )
        ),

        // SAFE TO SPEND CARD (Requirement #1 & #10)
        h('div', { className: `safe-spend-card ${stats.safeToSpend.status}` },
          h('div', { className: 'safe-spend-top' },
            h('div', { className: 'safe-spend-label' },
              h('span', null, '🛡️'),
              'SAFE TO SPEND'
            ),
            h('span', { className: `safe-spend-status-pill ${stats.safeToSpend.status}` },
              stats.safeToSpend.status === 'healthy' ? '✓ On Track' : stats.safeToSpend.status === 'warning' ? '⚠️ Caution' : '🚨 Risky'
            )
          ),
          h('div', { className: 'safe-spend-rate' },
            formatCurrency(stats.safeToSpend.daily, profile.currency),
            h('span', null, ' / day')
          ),
          h('div', { className: 'safe-spend-message' },
            stats.safeToSpend.message
          )
        ),

        // Three Compact KPI Cards: INCOME | EXPENSES | SAVINGS
        h('div', { className: 'tri-card-grid' },
          h('div', { className: 'mini-kpi-card' },
            h('div', { className: 'mini-kpi-label' }, 'INCOME'),
            h('div', { className: 'mini-kpi-value income' }, formatCurrency(stats.income, profile.currency))
          ),
          h('div', { className: 'mini-kpi-card' },
            h('div', { className: 'mini-kpi-label' }, 'EXPENSES'),
            h('div', { className: 'mini-kpi-value expense' }, formatCurrency(stats.expenses, profile.currency))
          ),
          h('div', { className: 'mini-kpi-card' },
            h('div', { className: 'mini-kpi-label' }, 'SAVINGS'),
            h('div', { className: 'mini-kpi-value savings' }, formatCurrency(stats.savings, profile.currency))
          )
        ),

        // UPCOMING BILLS / PAYMENTS WIDGET (Requirement #1 & #8)
        h('div', { className: 'upcoming-section' },
          h('div', { className: 'upcoming-header' },
            h('div', { className: 'upcoming-title' },
              h('span', null, '📅'),
              ' UPCOMING BILLS'
            ),
            h('button', {
              type: 'button',
              className: 'upcoming-view-all',
              onClick: () => setActiveTab('FIXED_PAYMENTS')
            }, 'View all →')
          ),
          stats.upcomingPayments.length === 0
            ? h('div', { style: { fontSize: '12.5px', color: 'var(--text-dim)', padding: '6px 0' } },
                'All recurring bills for this month are settled! 🎉'
              )
            : h('div', { className: 'upcoming-list' },
                stats.upcomingPayments.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId) || { icon: '💳' };
                  return h('div', {
                    key: p.id,
                    className: 'upcoming-item',
                    style: { cursor: 'pointer' },
                    title: 'Tap to edit obligation',
                    onClick: () => {
                      setEditingRecurring(p);
                      setIsAddRecurringOpen(true);
                    }
                  },
                    h('div', { className: 'upcoming-item-left' },
                      h('div', { className: 'upcoming-item-icon' }, cat.icon),
                      h('div', null,
                        h('div', { className: 'upcoming-item-name' }, p.name),
                        h('div', { className: 'upcoming-item-date' }, `Due on ${getMonthName(viewMonth - 1).slice(0, 3)} ${p.dueDay}`)
                      )
                    ),
                    h('div', { className: 'upcoming-item-amount' }, formatCurrency(p.amount, profile.currency))
                  );
                })
              )
        ),

        // Dual Mini Bar: Today's Spending & Monthly Budget
        h('div', { className: 'dual-stat-grid' },
          h('div', { className: 'stat-widget' },
            h('div', { className: 'widget-header' },
              h('span', { className: 'widget-label' }, "TODAY'S SPENDING"),
              h('span', { style: { fontSize: '11px', color: 'var(--text-dim)' } }, '⚡ Live')
            ),
            h('div', { className: 'widget-value' }, formatCurrency(stats.todaySpend, profile.currency)),
            h('div', { className: 'widget-sub' }, `${stats.todayCount} transaction${stats.todayCount === 1 ? '' : 's'}`)
          ),
          h('div', { className: 'stat-widget' },
            h('div', { className: 'widget-header' },
              h('span', { className: 'widget-label' }, 'MONTHLY BUDGET'),
              h('span', { style: { fontSize: '11px', color: 'var(--neon-green)', fontWeight: 700 } }, `${stats.budgetUsedPct}% used`)
            ),
            h('div', { className: 'widget-value' }, `${formatCurrency(stats.expenses, profile.currency)} / ${formatCurrency(monthlyBudgetLimit, profile.currency)}`),
            h('div', { className: 'budget-bar-track' },
              h('div', {
                className: `budget-bar-fill ${stats.budgetUsedPct > 100 ? 'overspent' : stats.budgetUsedPct > 85 ? 'warning' : 'healthy'}`,
                style: { width: `${Math.min(100, stats.budgetUsedPct)}%` }
              })
            )
          )
        ),

        // Spending by Category Donut Chart
        h('div', { className: 'donut-section-card' },
          h('div', { className: 'section-header', style: { margin: '0 0 16px 0' } },
            h('div', { className: 'section-title' },
              h('span', null, '📊'),
              " This Month's Spending"
            ),
            h('span', { style: { fontSize: '12px', color: 'var(--text-dim)' } }, `Total: ${formatCurrency(categoryBreakdown.total, profile.currency)}`)
          ),
          categoryBreakdown.list.length === 0
            ? h('div', { className: 'empty-state', style: { padding: '20px' } },
                h('div', { className: 'empty-desc' }, 'No expenses logged for this month yet.')
              )
            : h('div', { className: 'donut-layout' },
                h('div', { className: 'donut-svg-wrap' },
                  h('svg', { viewBox: '0 0 36 36', style: { width: '100%', height: '100%', transform: 'rotate(-90deg)' } },
                    h('circle', {
                      cx: '18',
                      cy: '18',
                      r: '15.9155',
                      fill: 'none',
                      stroke: 'rgba(255, 255, 255, 0.06)',
                      strokeWidth: '3.8'
                    }),
                    (() => {
                      let accumulated = 0;
                      return categoryBreakdown.list.slice(0, 5).map((cat) => {
                        const dasharray = `${cat.percentage} ${100 - cat.percentage}`;
                        const offset = 100 - accumulated;
                        accumulated += cat.percentage;
                        return h('circle', {
                          key: cat.id,
                          cx: '18',
                          cy: '18',
                          r: '15.9155',
                          fill: 'none',
                          stroke: cat.color,
                          strokeWidth: '3.8',
                          strokeDasharray: dasharray,
                          strokeDashoffset: offset
                        });
                      });
                    })()
                  ),
                  h('div', { className: 'donut-center-info' },
                    h('div', { className: 'donut-center-val' }, `${categoryBreakdown.list.length}`),
                    h('div', { className: 'donut-center-lbl' }, 'Categories')
                  )
                ),
                h('div', { className: 'donut-legend-list' },
                  categoryBreakdown.list.slice(0, 5).map((cat) =>
                    h('div', { key: cat.id, className: 'legend-item' },
                      h('div', { className: 'legend-item-left' },
                        h('span', { className: 'legend-color-dot', style: { background: cat.color } }),
                        h('span', null, `${cat.icon} ${cat.name}`)
                      ),
                      h('div', { className: 'legend-item-right' },
                        h('span', null, formatCurrency(cat.amount, profile.currency)),
                        h('span', { className: 'legend-pct' }, `${cat.percentage}%`)
                      )
                    )
                  )
                )
              )
        ),

        // Recent Transactions (Latest 4–5)
        h('div', null,
          h('div', { className: 'section-header' },
            h('div', { className: 'section-title' },
              h('span', null, '🕒'),
              ' Recent Transactions'
            ),
            h('button', {
              type: 'button',
              className: 'today-jump-btn',
              onClick: () => setActiveTab('TRANSACTIONS')
            }, 'View All ›')
          ),
          recentTxns.length === 0
            ? h('div', { className: 'empty-state' },
                h('span', { className: 'empty-icon' }, '📝'),
                h('div', { className: 'empty-title' }, 'No transactions yet'),
                h('div', { className: 'empty-desc' }, 'Tap the + button to record your first income or expense.')
              )
            : h('div', { className: 'txn-list' },
                recentTxns.map((t) =>
                  h('div', { key: t.id, className: 'txn-card' },
                    h('div', { className: 'txn-left' },
                      h('div', { className: 'txn-cat-icon' }, t.categoryIcon || '📦'),
                      h('div', { className: 'txn-details' },
                        h('div', { className: 'txn-desc' }, t.description),
                        h('div', { className: 'txn-meta' },
                          h('span', { className: 'txn-pill' }, t.categoryName || 'Other'),
                          h('span', { className: 'txn-pill' }, t.paymentMethod || 'UPI'),
                          t.isRecurring ? h('span', { className: 'txn-pill', style: { color: 'var(--neon-green)' } }, '🔄 Recurring') : null
                        )
                      )
                    ),
                    h('div', { className: 'txn-right' },
                      h('div', { className: `txn-amount ${t.type.toLowerCase()}` },
                        `${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount, profile.currency)}`
                      ),
                      h('div', { className: 'txn-date-time' }, t.date),
                      h('button', {
                        type: 'button',
                        className: 'txn-more-btn',
                        title: 'Actions',
                        onClick: () => setActiveTxnForMenu(t)
                      }, '⋯')
                    )
                  )
                )
              )
        )
      );
    };

    // =========================================================================
    // 2. TRANSACTIONS & CALENDAR VIEW (Requirements #1 - #12)
    // =========================================================================
    const renderTransactionsView = () => {
      // Filter transactions based on dateFilterMode, text search, type, category, and sort
      const filtered = displayedTxns;

      return h('div', { className: 'page-view' },
        // Top Header
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '📅'),
            ` Calendar & Financial Log`
          ),
          h('button', {
            type: 'button',
            className: 'today-jump-btn',
            onClick: () => {
              setEditingTxn(null);
              setIsAddTxnOpen(true);
            }
          }, '➕ New')
        ),

        // Quick Date Filter Chips Banner (Requirement #9)
        h('div', { className: 'quick-date-chips-wrap' },
          h('button', {
            type: 'button',
            className: `quick-date-chip ${dateFilterMode === 'CALENDAR' ? 'active' : ''}`,
            onClick: () => {
              setDateFilterMode('CALENDAR');
              setIsDayDetailsOpen(true);
            }
          }, `📅 ${selectedDateInfo.shortFormatted}`),
          h('button', {
            type: 'button',
            className: `quick-date-chip ${dateFilterMode === 'TODAY' ? 'active' : ''}`,
            onClick: () => {
              const todayDateStr = `${currentYear}-${currentMonthStr}-${pad(now.getDate())}`;
              setSelectedDate(todayDateStr);
              setCalYear(currentYear);
              setCalMonth(currentMonthNum);
              setDateFilterMode('TODAY');
            }
          }, '⚡ Today'),
          h('button', {
            type: 'button',
            className: `quick-date-chip ${dateFilterMode === 'YESTERDAY' ? 'active' : ''}`,
            onClick: () => {
              const yDate = new Date();
              yDate.setDate(yDate.getDate() - 1);
              const yStr = `${yDate.getFullYear()}-${pad(yDate.getMonth() + 1)}-${pad(yDate.getDate())}`;
              setSelectedDate(yStr);
              setCalYear(yDate.getFullYear());
              setCalMonth(yDate.getMonth() + 1);
              setDateFilterMode('YESTERDAY');
            }
          }, '⏮️ Yesterday'),
          h('button', {
            type: 'button',
            className: `quick-date-chip ${dateFilterMode === 'THIS_WEEK' ? 'active' : ''}`,
            onClick: () => setDateFilterMode('THIS_WEEK')
          }, '📆 This Week'),
          h('button', {
            type: 'button',
            className: `quick-date-chip ${dateFilterMode === 'THIS_MONTH' ? 'active' : ''}`,
            onClick: () => setDateFilterMode('THIS_MONTH')
          }, '🗓️ This Month'),
          h('button', {
            type: 'button',
            className: `quick-date-chip ${dateFilterMode === 'ALL' ? 'active' : ''}`,
            onClick: () => setDateFilterMode('ALL')
          }, '📋 All Records')
        ),

        // Desktop 2-Column or Mobile Stacked Flow (Requirements #11 & #12)
        h('div', { className: 'transactions-desktop-layout' },
          // Left Column: Interactive Calendar + Search Filters
          h('div', null,
            // Interactive Calendar Card (Requirement #1 & #10)
            h('div', {
              className: 'calendar-card',
              onTouchStart: handleTouchStart,
              onTouchEnd: handleTouchEnd
            },
              h('div', { className: 'calendar-header' },
                h('div', { className: 'calendar-title-wrap' },
                  h('span', { style: { fontSize: '18px' } }, '📅'),
                  h('span', { className: 'calendar-month-title' }, `${getMonthName(calMonth - 1)} ${calYear}`)
                ),
                h('div', { className: 'calendar-nav-controls' },
                  h('button', {
                    type: 'button',
                    className: 'cal-nav-btn',
                    title: 'Previous Month',
                    onClick: handleCalPrevMonth
                  }, '‹'),
                  h('button', {
                    type: 'button',
                    className: 'cal-nav-btn',
                    title: 'Next Month',
                    onClick: handleCalNextMonth
                  }, '›'),
                  h('button', {
                    type: 'button',
                    className: 'cal-today-btn',
                    title: 'Jump to Current Month and Today',
                    onClick: handleCalJumpToday
                  }, 'TODAY')
                )
              ),

              // Calendar Weekday Headers (Mon..Sun)
              h('div', { className: 'calendar-weekdays-row' },
                ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) =>
                  h('div', { key: day, className: 'calendar-weekday-col' }, day)
                )
              ),

              // Calendar Days Grid
              h('div', { className: 'calendar-grid' },
                calCells.map((cell, idx) => {
                  const todayDateStr = `${currentYear}-${currentMonthStr}-${pad(now.getDate())}`;
                  const isCellSelected = cell.dateStr === selectedDate;
                  const isCellToday = cell.dateStr === todayDateStr;
                  const ind = dateIndicators[cell.dateStr];

                  return h('div', {
                    key: `${cell.dateStr}-${idx}`,
                    className: `calendar-day-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${isCellToday ? 'today' : ''} ${isCellSelected ? 'selected' : ''}`,
                    onClick: () => {
                      setSelectedDate(cell.dateStr);
                      setDateFilterMode('CALENDAR');
                      if (!cell.isCurrentMonth) {
                        setCalYear(cell.year);
                        setCalMonth(cell.month);
                      }
                      setIsDayDetailsOpen(true);
                    }
                  },
                    h('span', { className: 'day-num' }, cell.day),
                    ind && (ind.hasIncome || ind.hasExpense)
                      ? h('div', { className: 'day-dots' },
                          ind.hasIncome ? h('span', { className: 'cal-dot income' }) : null,
                          ind.hasExpense ? h('span', { className: 'cal-dot expense' }) : null
                        )
                      : h('div', { className: 'day-dots' })
                  );
                })
              )
            ),

            // Search & Filters Bar
            h('div', { className: 'filter-bar' },
              h('div', { className: 'search-input-wrap' },
                h('span', { className: 'search-icon' }, '🔍'),
                h('input', {
                  type: 'text',
                  className: 'search-input',
                  placeholder: 'Search merchant, note, category, amount...',
                  value: txnSearch,
                  onChange: (e) => setTxnSearch(e.target.value)
                })
              ),
              h('select', {
                className: 'filter-select',
                value: txnTypeFilter,
                onChange: (e) => setTxnTypeFilter(e.target.value)
              },
                h('option', { value: 'ALL' }, 'All Types'),
                h('option', { value: 'EXPENSE' }, 'Expenses'),
                h('option', { value: 'INCOME' }, 'Income'),
                h('option', { value: 'REFUND' }, 'Refunds'),
                h('option', { value: 'FUND_CONTRIBUTION' }, 'Goal Allocations'),
                h('option', { value: 'TRANSFER' }, 'Transfers')
              ),
              h('select', {
                className: 'filter-select',
                value: txnCatFilter,
                onChange: (e) => setTxnCatFilter(e.target.value)
              },
                h('option', { value: 'ALL' }, 'All Categories'),
                categories.map((c) => h('option', { key: c.id, value: c.id }, `${c.icon} ${c.name}`))
              ),
              h('select', {
                className: 'filter-select',
                value: txnSort,
                onChange: (e) => setTxnSort(e.target.value)
              },
                h('option', { value: 'NEWEST' }, 'Newest First'),
                h('option', { value: 'OLDEST' }, 'Oldest First'),
                h('option', { value: 'HIGHEST' }, 'Highest Amount'),
                h('option', { value: 'LOWEST' }, 'Lowest Amount')
              )
            )
          ),

          // Right Column: Selected Date Summary + Daily Transactions List (Requirement #2 & #3)
          h('div', null,
            // Selected Date Summary Card
            h('div', { className: 'date-summary-card' },
              h('div', { className: 'date-summary-header' },
                h('div', {
                  className: 'date-summary-title clickable',
                  title: 'Click to open day edit options',
                  onClick: () => setIsDayDetailsOpen(true)
                },
                  h('span', null, '📅'),
                  ` Selected Date: ${selectedDateInfo.formatted}`
                ),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                  h('div', { className: 'date-summary-weekday' }, selectedDateInfo.weekday),
                  h('button', {
                    type: 'button',
                    className: 'edit-day-btn',
                    title: 'Edit details for this day',
                    onClick: (e) => {
                      e.stopPropagation();
                      setIsDayDetailsOpen(true);
                    }
                  }, '✏️ Edit Day')
                )
              ),
              h('div', { className: 'date-summary-metrics' },
                h('div', { className: 'date-metric-item' },
                  h('span', { className: 'date-metric-label' }, 'Income'),
                  h('span', { className: 'date-metric-value income' }, `+${formatCurrency(dateStats.income, profile.currency)}`)
                ),
                h('div', { className: 'date-metric-item' },
                  h('span', { className: 'date-metric-label' }, 'Expenses'),
                  h('span', { className: 'date-metric-value expense' }, formatCurrency(dateStats.expenses, profile.currency))
                ),
                h('div', { className: 'date-metric-item' },
                  h('span', { className: 'date-metric-label' }, 'Net'),
                  h('span', {
                    className: `date-metric-value ${dateStats.net > 0 ? 'net-positive' : dateStats.net < 0 ? 'net-negative' : 'net-zero'}`
                  }, `${dateStats.net > 0 ? '+' : ''}${formatCurrency(dateStats.net, profile.currency)}`)
                )
              )
            ),

            // Date Transaction List (Requirement #3)
            h('div', { className: 'section-header', style: { marginTop: '10px' } },
              h('div', { className: 'section-title', style: { fontSize: '14px' } },
                h('span', null, '📋'),
                ` Transactions (${filtered.length})`
              ),
              h('div', { style: { display: 'flex', gap: '6px' } },
                h('button', {
                  type: 'button',
                  className: 'edit-day-btn',
                  title: 'Open day editor and options',
                  onClick: () => setIsDayDetailsOpen(true)
                }, '✏️ Edit Day'),
                h('button', {
                  type: 'button',
                  className: 'today-jump-btn',
                  onClick: () => {
                    setEditingTxn(null);
                    setIsAddTxnOpen(true);
                  }
                }, '+ Add')
              )
            ),

            filtered.length === 0
              ? h('div', { className: 'empty-state' },
                  h('span', { className: 'empty-icon' }, '📅'),
                  h('div', { className: 'empty-title' }, `No transactions on ${selectedDateInfo.formatted}`),
                  h('div', { className: 'empty-desc' }, 'No financial activities recorded for this date.'),
                  h('button', {
                    type: 'button',
                    className: 'submit-btn',
                    style: { marginTop: '12px', fontSize: '13px', padding: '10px 16px' },
                    onClick: () => {
                      setEditingTxn(null);
                      setIsAddTxnOpen(true);
                    }
                  }, '➕ Log Transaction for this Date')
                )
              : h('div', { className: 'txn-list' },
                  filtered.map((t) =>
                    h('div', {
                      key: t.id,
                      className: 'txn-card clickable',
                      title: 'Click to edit transaction',
                      onClick: () => {
                        setEditingTxn(t);
                        setIsAddTxnOpen(true);
                      }
                    },
                      h('div', { className: 'txn-left' },
                        h('div', { className: 'txn-cat-icon' }, t.categoryIcon || '📦'),
                        h('div', { className: 'txn-details' },
                          h('div', { className: 'txn-desc' }, t.description),
                          h('div', { className: 'txn-meta' },
                            h('span', { className: 'txn-pill' }, t.categoryName || 'Other'),
                            h('span', { className: 'txn-pill' }, t.paymentMethod || 'UPI'),
                            t.time ? h('span', { className: 'txn-pill' }, formatTimeAMPM(t.time)) : null,
                            t.source === 'SMS'
                              ? h('span', { className: 'source-badge sms' }, '📱 SMS' + (t.isEdited ? ' · Edited' : ''))
                              : t.source === 'IMPORT'
                              ? h('span', { className: 'source-badge import' }, '📥 Import')
                              : t.isRecurring
                              ? h('span', { className: 'source-badge recurring' }, '🔄 Auto')
                              : h('span', { className: 'source-badge manual' }, '✏️ Manual')
                          ),
                          t.notes ? h('div', { style: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' } }, t.notes) : null
                        )
                      ),
                      h('div', { className: 'txn-right' },
                        h('div', { className: `txn-amount ${t.type.toLowerCase()}` },
                          `${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount, profile.currency)}`
                        ),
                        h('div', { className: 'txn-date-time' }, `${t.date} ${t.time ? formatTimeAMPM(t.time) : ''}`),
                        h('button', {
                          type: 'button',
                          className: 'txn-more-btn',
                          title: 'More actions',
                          onClick: (e) => {
                            e.stopPropagation();
                            setActiveTxnForMenu(t);
                          }
                        }, '⋯')
                      )
                    )
                  )
                )
          )
        )
      );
    };

    // =========================================================================
    // 3. GOALS VIEW (Requirement #4 — Formerly Funds)
    // =========================================================================
    const renderGoalsView = () => {
      const activeGoals = goals.filter((g) => g.status !== 'ARCHIVED');

      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '🎯'),
            ` Savings Goals (${activeGoals.length})`
          ),
          h('button', {
            type: 'button',
            className: 'today-jump-btn',
            onClick: () => {
              setEditingGoal(null);
              setIsAddGoalOpen(true);
            }
          }, '➕ Create Goal')
        ),

        // Principle reminder card
        h('div', {
          style: {
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: '12.5px',
            color: 'var(--text-muted)',
            marginBottom: '18px',
            lineHeight: 1.5
          }
        },
          h('strong', { style: { color: 'var(--info-blue)' } }, '💡 Financial Principle: '),
          'Goal contributions build your wealth and are ',
          h('strong', { style: { color: '#fff' } }, 'NOT counted as ordinary spending expenses'),
          ' in your monthly budget.'
        ),

        // Goals Grid
        activeGoals.length === 0
          ? h('div', { className: 'empty-state' },
              h('span', { className: 'empty-icon' }, '🎯'),
              h('div', { className: 'empty-title' }, 'No savings goals yet'),
              h('div', { className: 'empty-desc' }, 'Create a goal for Emergency Fund, Vacation, or a Laptop to start building wealth.')
            )
          : h('div', { className: 'funds-grid' },
              activeGoals.map((g) => {
                const pct = g.targetAmount > 0 ? safeRound((g.currentAmount / g.targetAmount) * 100) : 0;
                const remaining = safeRound(Math.max(0, g.targetAmount - g.currentAmount));
                const estCompletion = calculateGoalEstimatedCompletion(remaining, g.contributionAmount, g.frequency);

                return h('div', { key: g.id, className: 'goal-card' },
                  h('div', { className: 'goal-top' },
                    h('div', { className: 'goal-title-wrap' },
                      h('div', { className: 'goal-icon' }, g.icon || '🎯'),
                      h('div', null,
                        h('div', { className: 'goal-name' }, g.name),
                        h('div', { className: 'goal-schedule' }, `${formatCurrency(g.contributionAmount, profile.currency)} / ${g.frequency.toLowerCase()}`)
                      )
                    ),
                    h('div', { className: 'goal-pct-badge' }, `${Math.min(100, pct)}%`)
                  ),

                  // Progress Bar
                  h('div', { className: 'goal-progress-wrap' },
                    h('div', { className: 'goal-progress-bar' },
                      h('div', { className: 'goal-progress-fill', style: { width: `${Math.min(100, pct)}%` } })
                    )
                  ),

                  // Saved vs Target Stats
                  h('div', { className: 'goal-stats-row' },
                    h('span', null,
                      h('strong', { className: 'goal-saved' }, formatCurrency(g.currentAmount, profile.currency)),
                      ' / ',
                      formatCurrency(g.targetAmount, profile.currency)
                    ),
                    h('span', { className: 'goal-remaining' }, `${formatCurrency(remaining, profile.currency)} remaining`)
                  ),

                  // Estimated Completion Date
                  h('div', { className: 'goal-estimated-date' },
                    h('span', null, 'Estimated completion:'),
                    h('span', null, estCompletion)
                  ),

                  // Actions
                  h('div', { className: 'goal-actions-row' },
                    h('button', {
                      type: 'button',
                      className: 'submit-btn',
                      style: { flex: 1, padding: '10px 14px', fontSize: '13px' },
                      onClick: () => setActiveGoalForContrib(g)
                    }, '➕ Add Contribution'),
                    h('button', {
                      type: 'button',
                      className: 'cancel-btn',
                      style: { padding: '10px 14px', fontSize: '13px' },
                      onClick: () => {
                        setEditingGoal(g);
                        setIsAddGoalOpen(true);
                      }
                    }, '✏️ Edit'),
                    h('button', {
                      type: 'button',
                      className: 'cancel-btn',
                      style: { padding: '10px 12px', fontSize: '13px' },
                      title: 'Archive Goal',
                      onClick: () => handleArchiveGoal(g.id)
                    }, '🗄️')
                  )
                );
              })
            ),

        // Recent Contributions Ledger
        h('div', { style: { marginTop: '24px' } },
          h('div', { className: 'section-title', style: { marginBottom: '12px' } },
            h('span', null, '📜'),
            ' Goal Contribution History'
          ),
          contributions.length === 0
            ? h('div', { className: 'empty-state', style: { padding: '20px' } },
                h('div', { className: 'empty-desc' }, 'No contributions recorded yet.')
              )
            : h('div', { className: 'txn-list' },
                contributions.slice(0, 5).map((c) => {
                  const goal = goals.find((g) => g.id === c.fundId);
                  return h('div', { key: c.id, className: 'txn-card' },
                    h('div', { className: 'txn-left' },
                      h('div', { className: 'txn-cat-icon' }, goal ? goal.icon : '🎯'),
                      h('div', { className: 'txn-details' },
                        h('div', { className: 'txn-desc' }, goal ? goal.name : 'Goal Allocation'),
                        h('div', { className: 'txn-meta' },
                          h('span', { className: 'txn-pill' }, c.date),
                          c.notes ? h('span', null, c.notes) : null
                        )
                      )
                    ),
                    h('div', { className: 'txn-right' },
                      h('div', { className: 'txn-amount income' }, `+${formatCurrency(c.amount, profile.currency)}`)
                    )
                  );
                })
              )
        )
      );
    };

    // =========================================================================
    // 4. BUDGET VIEW WITH FORECASTING (Requirement #5 & #11)
    // =========================================================================
    const renderBudgetView = () => {
      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '🎯'),
            ` Monthly Spending Limits (${getMonthName(viewMonth - 1)} ${viewYear})`
          ),
          h('button', {
            type: 'button',
            className: 'today-jump-btn',
            onClick: () => setIsCatBudgetModalOpen(true)
          }, '➕ Category Budget')
        ),

        // Budget Forecasting Card (Requirement #5)
        h('div', { className: 'forecast-card' },
          h('div', { className: 'forecast-header' },
            h('div', { className: 'forecast-title' },
              h('span', null, '🔮 '),
              'BUDGET FORECASTING'
            ),
            h('span', {
              className: `forecast-status-badge ${stats.forecast.status.toLowerCase().replace(/\s+/g, '-')}`
            }, stats.forecast.status)
          ),
          h('div', { className: 'forecast-values' },
            h('div', { className: 'forecast-proj-amount' },
              formatCurrency(stats.forecast.projectedTotal, profile.currency)
            ),
            h('div', { className: 'forecast-sub' }, 'Projected Month-End Spend')
          ),
          h('div', { style: { fontSize: '13px', color: stats.forecast.isLikelyToExceed ? 'var(--overspent-red)' : 'var(--neon-green)', fontWeight: 700 } },
            stats.forecast.isLikelyToExceed
              ? `⚠️ Likely to exceed monthly budget by ${formatCurrency(stats.forecast.variance, profile.currency)} based on current daily pace.`
              : `✓ Current pace is sustainable — projected to finish within budget!`
          )
        ),

        // Monthly Budget KPI Hero
        h('div', { className: 'stat-widget', style: { marginBottom: '18px' } },
          h('div', { className: 'dual-stat-grid', style: { marginBottom: '12px' } },
            h('div', null,
              h('div', { className: 'mini-kpi-label' }, 'TOTAL BUDGET'),
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: '#fff' } }, formatCurrency(monthlyBudgetLimit, profile.currency))
            ),
            h('div', null,
              h('div', { className: 'mini-kpi-label' }, 'ACTUAL SPENT'),
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: 'var(--expense-pink)' } }, formatCurrency(stats.expenses, profile.currency))
            ),
            h('div', null,
              h('div', { className: 'mini-kpi-label' }, 'REMAINING'),
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: 'var(--neon-green)' } }, formatCurrency(stats.budgetRemaining, profile.currency))
            ),
            h('div', null,
              h('div', { className: 'mini-kpi-label' }, 'PROGRESS'),
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: '#fff' } }, `${stats.budgetUsedPct}%`)
            )
          ),
          h('div', { className: 'budget-bar-track', style: { height: '10px' } },
            h('div', {
              className: `budget-bar-fill ${stats.budgetUsedPct > 100 ? 'overspent' : stats.budgetUsedPct > 85 ? 'warning' : 'healthy'}`,
              style: { width: `${Math.min(100, stats.budgetUsedPct)}%` }
            })
          )
        ),

        // Category Budgets List with Projections
        h('div', { className: 'category-budgets-grid' },
          categoryBudgets.map((cb) => {
            const cat = categories.find((c) => c.id === cb.categoryId) || { name: 'Category', icon: '📦', color: '#00f59b' };
            const spent = categoryBreakdown.list.find((item) => item.id === cb.categoryId)?.amount || 0;
            const pct = cb.limitAmount > 0 ? safeRound((spent / cb.limitAmount) * 100) : 0;

            let statusClass = 'healthy';
            let statusLabel = 'Healthy';
            if (pct > 100) {
              statusClass = 'overspent';
              statusLabel = 'OVER BUDGET';
            } else if (pct >= 85) {
              statusClass = 'warning';
              statusLabel = 'Warning';
            }

            return h('div', { key: cb.categoryId, className: 'stat-widget' },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#fff' } },
                  h('span', null, cat.icon),
                  cat.name
                ),
                h('span', { className: `forecast-status-badge ${statusClass}` }, `${statusLabel} (${pct}%)`)
              ),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' } },
                h('span', { style: { color: 'var(--text-muted)' } }, 'Used / Limit:'),
                h('strong', null, `${formatCurrency(spent, profile.currency)} / ${formatCurrency(cb.limitAmount, profile.currency)}`)
              ),
              h('div', { className: 'budget-bar-track' },
                h('div', {
                  className: `budget-bar-fill ${statusClass}`,
                  style: { width: `${Math.min(100, pct)}%` }
                })
              )
            );
          })
        )
      );
    };

    // =========================================================================
    // 5. RECURRING OBLIGATIONS VIEW (Requirement #3)
    // =========================================================================
    const renderFixedPaymentsView = () => {
      const getOrdinalDay = (day) => {
        const n = parseInt(day, 10);
        if (!n) return day || '1st';
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '📅'),
            ' Recurring Transactions & Bills'
          ),
          h('button', {
            type: 'button',
            className: 'today-jump-btn',
            onClick: () => {
              setEditingRecurring(null);
              setIsAddRecurringOpen(true);
            }
          }, '➕ Add Recurring')
        ),

        h('div', { className: 'txn-list' },
          recurringPayments.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId) || { icon: '💳' };
            const accountLabel = p.paymentAccount || 'Bank';
            const freqLabel = p.frequency
              ? p.frequency.charAt(0).toUpperCase() + p.frequency.slice(1).toLowerCase()
              : 'Monthly';

            return h('div', {
              key: p.id,
              className: 'txn-card',
              style: { cursor: 'pointer' },
              title: 'Tap to edit obligation details',
              onClick: () => {
                setEditingRecurring(p);
                setIsAddRecurringOpen(true);
              }
            },
              h('div', { className: 'txn-left' },
                h('div', { className: 'txn-cat-icon' }, cat.icon),
                h('div', null,
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                    h('span', { style: { fontSize: '15px', fontWeight: 800, color: '#fff' } }, p.name),
                    h('span', {
                      style: {
                        fontSize: '11px',
                        color: 'var(--text-dim)',
                        padding: '1px 6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '4px'
                      }
                    }, '✏️ Edit')
                  ),
                  h('div', { style: { fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px' } },
                    `Due ${getOrdinalDay(p.dueDay)} · ${freqLabel} · ${accountLabel} · ${p.autoAdd ? '⚡ Auto-add' : 'Manual'}`
                  )
                )
              ),
              h('div', { className: 'txn-right' },
                h('div', { className: 'txn-amount expense' }, formatCurrency(p.amount, profile.currency)),
                h('button', {
                  type: 'button',
                  className: `mini-action-btn ${p.isPaid ? 'paid' : ''}`,
                  style: {
                    background: p.isPaid ? 'var(--neon-green-subtle)' : 'rgba(255, 255, 255, 0.06)',
                    color: p.isPaid ? 'var(--neon-green)' : 'var(--text-muted)',
                    marginTop: '6px'
                  },
                  onClick: (e) => {
                    e.stopPropagation();
                    handleToggleRecurringPayment(p.id);
                  }
                }, p.isPaid ? '✓ Paid' : '⏳ Mark Paid')
              )
            );
          })
        )
      );
    };

    // =========================================================================
    // 6. REPORTS VIEW WITH VISUAL ANALYTICS (Requirement #6)
    // =========================================================================
    const renderReportsView = () => {
      // Previous Month Comparison (Month-over-Month Shift)
      const prevMonthNum = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevYearNum = viewMonth === 1 ? viewYear - 1 : viewYear;
      const prevPrefix = `${prevYearNum}-${pad(prevMonthNum)}`;

      let prevExpenses = 0;
      let prevIncome = 0;
      const prevCatMap = {};

      transactions.forEach((t) => {
        if (t.date && t.date.startsWith(prevPrefix)) {
          if (t.type === 'EXPENSE') {
            prevExpenses += t.amount;
            prevCatMap[t.categoryId] = (prevCatMap[t.categoryId] || 0) + t.amount;
          } else if (t.type === 'INCOME') {
            prevIncome += t.amount;
          }
        }
      });

      const momSpendDiff = safeRound(stats.expenses - prevExpenses);
      const momPct = prevExpenses > 0 ? safeRound(((stats.expenses - prevExpenses) / prevExpenses) * 100) : 0;

      // Category Trends Comparison
      const catTrends = categoryBreakdown.list.map((c) => {
        const prevAmt = prevCatMap[c.id] || 0;
        const diff = safeRound(c.amount - prevAmt);
        const shiftPct = prevAmt > 0 ? safeRound(((c.amount - prevAmt) / prevAmt) * 100) : 100;
        return { ...c, prevAmt, diff, shiftPct };
      });

      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '📈'),
            ' Financial Analytics & Insights'
          )
        ),

        // Timeframe Selector
        h('div', { className: 'timeframe-pills' },
          ['1M', '3M', '6M', '1Y', 'ALL'].map((tf) =>
            h('button', {
              key: tf,
              type: 'button',
              className: `timeframe-pill ${reportsRange === tf ? 'active' : ''}`,
              onClick: () => setReportsRange(tf)
            }, tf === '1M' ? '1 Month' : tf === '3M' ? '3 Months' : tf === '6M' ? '6 Months' : tf === '1Y' ? '1 Year' : 'All Time')
          )
        ),

        // 4 KPI Summary Cards
        h('div', { className: 'dual-stat-grid' },
          h('div', { className: 'stat-widget' },
            h('div', { className: 'mini-kpi-label' }, 'TOP SPENDING CATEGORY'),
            h('div', { className: 'widget-value', style: { fontSize: '18px', color: 'var(--neon-green)' } }, stats.highestCat)
          ),
          h('div', { className: 'stat-widget' },
            h('div', { className: 'mini-kpi-label' }, 'AVG DAILY SPEND'),
            h('div', { className: 'widget-value', style: { fontSize: '18px' } }, formatCurrency(stats.dailyAvg, profile.currency))
          ),
          h('div', { className: 'stat-widget' },
            h('div', { className: 'mini-kpi-label' }, 'HIGHEST SPENDING DAY'),
            h('div', { className: 'widget-value', style: { fontSize: '16px' } }, stats.highestDay)
          ),
          h('div', { className: 'stat-widget' },
            h('div', { className: 'mini-kpi-label' }, 'TOTAL TRANSACTIONS'),
            h('div', { className: 'widget-value', style: { fontSize: '18px' } }, `${stats.monthTxnCount} logged`)
          )
        ),

        // E. Month-over-Month Comparison Card (Requirement #6)
        h('div', { className: 'analytics-card' },
          h('div', { className: 'analytics-card-title' },
            h('span', null, '🗓️'),
            ` Month-over-Month Comparison (${getMonthName(viewMonth - 1)} vs ${getMonthName(prevMonthNum - 1)})`
          ),
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px', margin: '10px 0 6px' } },
            h('div', { style: { fontSize: '24px', fontWeight: 900, color: momPct > 0 ? 'var(--expense-pink)' : 'var(--neon-green)' } },
              `${momPct > 0 ? '↑' : '↓'} ${Math.abs(momPct)}%`
            ),
            h('div', { style: { fontSize: '13px', color: 'var(--text-muted)' } },
              `${momPct > 0 ? 'Increased' : 'Decreased'} by ${formatCurrency(Math.abs(momSpendDiff), profile.currency)} compared to last month`
            )
          )
        ),

        // B. Income vs Expenses Visual Bar Comparison (Requirement #6)
        h('div', { className: 'analytics-card' },
          h('div', { className: 'analytics-card-title' },
            h('span', null, '⚖️'),
            ' Income vs Expenses Comparison'
          ),
          h('div', { style: { marginTop: '12px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' } },
              h('span', { style: { color: 'var(--income-green)', fontWeight: 700 } }, `Income: ${formatCurrency(stats.income, profile.currency)}`),
              h('span', { style: { color: 'var(--expense-pink)', fontWeight: 700 } }, `Expenses: ${formatCurrency(stats.expenses, profile.currency)}`)
            ),
            h('div', { style: { display: 'flex', height: '12px', borderRadius: 'var(--radius-pill)', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' } },
              h('div', {
                style: {
                  width: `${stats.income + stats.expenses > 0 ? (stats.income / (stats.income + stats.expenses)) * 100 : 50}%`,
                  background: 'var(--income-green)',
                  transition: 'width 0.3s'
                }
              }),
              h('div', {
                style: {
                  width: `${stats.income + stats.expenses > 0 ? (stats.expenses / (stats.income + stats.expenses)) * 100 : 50}%`,
                  background: 'var(--expense-pink)',
                  transition: 'width 0.3s'
                }
              })
            ),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' } },
              h('span', null, `Net Saved: ${formatCurrency(stats.savings, profile.currency)}`),
              h('span', null, `Savings Rate: ${stats.savingsPct}%`)
            )
          )
        ),

        // D. Category Trends Shift (Requirement #6)
        h('div', { className: 'analytics-card' },
          h('div', { className: 'analytics-card-title' },
            h('span', null, '📊'),
            ' Category Spending Shifts vs Last Month'
          ),
          catTrends.length === 0
            ? h('div', { className: 'empty-desc', style: { padding: '12px 0' } }, 'No category spend recorded.')
            : catTrends.slice(0, 6).map((c) =>
                h('div', { key: c.id, className: 'comparison-row' },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                    h('span', null, c.icon),
                    h('span', { style: { color: '#fff', fontWeight: 700 } }, c.name)
                  ),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                    h('span', { style: { fontWeight: 700, color: '#fff' } }, formatCurrency(c.amount, profile.currency)),
                    h('span', { className: `trend-pill ${c.diff > 0 ? 'up' : 'down'}` },
                      `${c.diff > 0 ? '↑' : '↓'} ${Math.abs(c.shiftPct)}%`
                    )
                  )
                )
              )
        ),

        // Monthly Comparison Historical Table
        h('div', { className: 'report-table-card' },
          h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '12px' } }, '🗓️ 3-Month Financial Ledger Comparison'),
          h('table', { className: 'report-table' },
            h('thead', null,
              h('tr', null,
                h('th', null, 'Month'),
                h('th', null, 'Income'),
                h('th', null, 'Expenses'),
                h('th', null, 'Net Saved'),
                h('th', null, 'Savings %')
              )
            ),
            h('tbody', null,
              [0, 1, 2].map((offset) => {
                const targetM = (viewMonth - offset + 12) % 12 || 12;
                const targetY = viewMonth - offset <= 0 ? viewYear - 1 : viewYear;
                const mPrefix = `${targetY}-${pad(targetM)}`;

                let mInc = 0;
                let mExp = 0;
                transactions.forEach((t) => {
                  if (t.date && t.date.startsWith(mPrefix)) {
                    if (t.type === 'INCOME') mInc += t.amount;
                    else if (t.type === 'EXPENSE') mExp += t.amount;
                  }
                });
                const mSaved = safeRound(mInc - mExp);
                const mPct = mInc > 0 ? safeRound((mSaved / mInc) * 100) : 0;

                return h('tr', { key: offset },
                  h('td', { style: { color: '#fff', fontWeight: 700 } }, `${getMonthName(targetM - 1)} ${targetY}`),
                  h('td', { style: { color: 'var(--income-green)' } }, formatCurrency(mInc, profile.currency)),
                  h('td', { style: { color: 'var(--expense-pink)' } }, formatCurrency(mExp, profile.currency)),
                  h('td', { style: { color: 'var(--neon-green)' } }, formatCurrency(mSaved, profile.currency)),
                  h('td', null, `${mPct}%`)
                );
              })
            )
          )
        )
      );
    };

    // =========================================================================
    // 7. MORE / SETTINGS HUB PAGE (Requirement #7)
    // =========================================================================
    const renderMoreView = () => {
      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '⚙️'),
            ' Settings & Preferences'
          )
        ),

        // User Profile Summary Card with Currency Selector
        h('div', { className: 'stat-widget', style: { marginBottom: '18px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
              h('div', { className: 'logo-badge', style: { width: '46px', height: '46px', fontSize: '22px' } }, '👤'),
              h('div', null,
                h('div', { style: { fontSize: '17px', fontWeight: 800, color: '#fff' } }, profile.name),
                h('div', { style: { fontSize: '12px', color: 'var(--text-dim)' } }, 'Personal Finance Account')
              )
            )
          ),
          // Currency Preference (Requirement #8)
          h('div', { className: 'form-group', style: { margin: 0 } },
            h('label', { className: 'form-label' }, 'Currency'),
            h('select', {
              className: 'form-select',
              value: profile.currencyCode || 'INR',
              onChange: (e) => {
                const found = SUPPORTED_CURRENCIES.find((c) => c.code === e.target.value) || SUPPORTED_CURRENCIES[0];
                setProfile((p) => ({ ...p, currency: found.symbol, currencyCode: found.code }));
                showToast(`Currency set to ${found.label}`);
              }
            },
              SUPPORTED_CURRENCIES.map((c) => h('option', { key: c.code, value: c.code }, c.label))
            )
          )
        ),

        // Settings Menu
        h('div', { className: 'settings-hub-grid' },
          // Clean DATA & GIT SYNC
          h('div', { className: 'settings-row', onClick: () => setIsDataSyncOpen(true) },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '☁️'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Git & Cloud Data Sync'),
                h('div', { className: 'settings-sub' },
                  liveSyncConnected ? '🟢 Git Sync Active (Radhadevan/expense-tracker)' : 'Git storage (Tap to pull/sync)'
                )
              )
            ),
            h('span', { style: { color: 'var(--text-dim)' } }, '›')
          ),

          // Payment Accounts
          h('div', { className: 'settings-row', onClick: () => setIsAddAccountOpen(true) },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '💳'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Payment Accounts'),
                h('div', { className: 'settings-sub' }, `${accounts.length} active accounts (Bank, UPI, Cards, Cash)`)
              )
            ),
            h('span', { style: { color: 'var(--text-dim)' } }, '›')
          ),

          // Recurring Obligations
          h('div', { className: 'settings-row', onClick: () => setActiveTab('FIXED_PAYMENTS') },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '📅'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Recurring Transactions & Bills'),
                h('div', { className: 'settings-sub' }, 'Manage EMI, Rent, Subscriptions, and Due dates')
              )
            ),
            h('span', { style: { color: 'var(--text-dim)' } }, '›')
          ),

          // DATA & BACKUP SECTION (Requirement #7 & #21 & #22)
          h('div', { style: { marginTop: '14px', marginBottom: '6px' } },
            h('div', { className: 'section-title', style: { fontSize: '13px' } },
              h('span', null, '📂'),
              ' Data Exports & Backup'
            )
          ),

          // Export CSV
          h('div', {
            className: 'settings-row',
            onClick: () => {
              exportTransactionsCSV(transactions, profile.currency);
              showToast('Transactions CSV exported!');
            }
          },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '📄'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Export Transactions (CSV)'),
                h('div', { className: 'settings-sub' }, 'Compatible with Excel & Google Sheets')
              )
            ),
            h('span', { style: { color: 'var(--neon-green)', fontWeight: 800 } }, '⬇ CSV')
          ),

          // Export PDF Statement
          h('div', {
            className: 'settings-row',
            onClick: () => {
              exportPDFReport(transactions, stats, monthlyBudgetLimit, profile, viewMonth, viewYear);
              showToast('Generating Monthly PDF statement...');
            }
          },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '📊'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Export Monthly Statement (PDF)'),
                h('div', { className: 'settings-sub' }, `Executive statement for ${getMonthName(viewMonth - 1)} ${viewYear}`)
              )
            ),
            h('span', { style: { color: 'var(--neon-green)', fontWeight: 800 } }, '⬇ PDF')
          ),

          // Advanced JSON Backup
          h('div', { className: 'settings-row', onClick: handleExportBackup },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '💾'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Export Complete Backup (JSON)'),
                h('div', { className: 'settings-sub' }, 'Save entire database for offline recovery')
              )
            ),
            h('span', { style: { color: 'var(--text-dim)' } }, '⬇')
          ),

          h('label', { className: 'settings-row', style: { cursor: 'pointer' } },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '📥'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Restore from Backup (JSON)'),
                h('div', { className: 'settings-sub' }, 'Load a previously saved backup file')
              )
            ),
            h('input', {
              type: 'file',
              accept: '.json',
              style: { display: 'none' },
              onChange: handleImportBackup
            }),
            h('span', { style: { color: 'var(--text-dim)' } }, '›')
          ),

          // SECURITY & PRIVACY (Requirement #10)
          h('div', { style: { marginTop: '14px', marginBottom: '6px' } },
            h('div', { className: 'section-title', style: { fontSize: '13px' } },
              h('span', null, '🔒'),
              ' Security & Privacy'
            )
          ),

          h('div', {
            className: 'settings-row',
            onClick: () => {
              if (appLock.enabled) {
                if (confirm('Disable App Lock?')) {
                  setAppLock({ enabled: false, pin: '', isLocked: false });
                  showToast('App Lock disabled.');
                }
              } else {
                setIsAppLockSetupOpen(true);
              }
            }
          },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '🛡️'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'App Lock (PIN Protection)'),
                h('div', { className: 'settings-sub' }, appLock.enabled ? 'PIN protection is active' : 'Lock app when closed')
              )
            ),
            h('span', {
              style: {
                color: appLock.enabled ? 'var(--neon-green)' : 'var(--text-dim)',
                fontWeight: 800,
                fontSize: '12px'
              }
            }, appLock.enabled ? '● ON' : '○ OFF')
          ),

          // DEVELOPER MODE (Requirement #7)
          h('div', { style: { marginTop: '14px', marginBottom: '6px' } },
            h('div', { className: 'section-title', style: { fontSize: '13px' } },
              h('span', null, '🛠️'),
              ' Developer / Demo Mode'
            )
          ),

          h('div', {
            className: 'settings-row',
            onClick: () => {
              setDeveloperMode((d) => !d);
              showToast(`Developer Mode ${!developerMode ? 'Enabled' : 'Disabled'}`);
            }
          },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '⚙️'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Developer Mode'),
                h('div', { className: 'settings-sub' }, 'Reveal demo tools and test configurations')
              )
            ),
            h('span', {
              style: {
                color: developerMode ? 'var(--neon-green)' : 'var(--text-dim)',
                fontWeight: 800,
                fontSize: '12px'
              }
            }, developerMode ? '● ON' : '○ OFF')
          ),

          developerMode &&
            h('div', { className: 'settings-row', onClick: handleResetSampleData },
              h('div', { className: 'settings-row-left' },
                h('span', { className: 'settings-icon' }, '🔄'),
                h('div', null,
                  h('div', { className: 'settings-label', style: { color: 'var(--warning-amber)' } }, 'Reset to Initial Sample Data'),
                  h('div', { className: 'settings-sub' }, 'Overwrites custom records with clean demonstration data')
                )
              ),
              h('span', { style: { color: 'var(--warning-amber)' } }, '›')
            ),

          // DANGER ZONE (Requirement #7)
          h('div', { className: 'danger-zone-card' },
            h('div', { className: 'danger-zone-title' },
              h('span', null, '⚠️'),
              ' DANGER ZONE'
            ),
            h('div', { className: 'danger-zone-desc' },
              'Irreversibly delete all your local transactions and savings records. This cannot be undone.'
            ),
            h('button', {
              type: 'button',
              className: 'danger-btn',
              onClick: () => setIsDangerZoneOpen(true)
            }, '🗑️ Clear All Expense Data')
          )
        )
      );
    };

    // =========================================================================
    // MODAL DIALOGS
    // =========================================================================

    // Day Details & Edit Popup Modal (Opens when selecting a day or clicking Date Edit Option)
    const renderDayDetailsModal = () => {
      if (!isDayDetailsOpen) return null;

      return h(DayDetailsModalDialog, {
        dateStr: selectedDate,
        dateInfo: selectedDateInfo,
        dateStats,
        transactions,
        currency: profile.currency,
        onClose: () => setIsDayDetailsOpen(false),
        onEditTxn: (txn) => {
          setIsDayDetailsOpen(false);
          setEditingTxn(txn);
          setIsAddTxnOpen(true);
        },
        onAddTxn: () => {
          setIsDayDetailsOpen(false);
          setEditingTxn(null);
          setIsAddTxnOpen(true);
        },
        onDeleteTxn: (txn) => {
          setDeletingTxnId(txn.id);
        }
      });
    };

    // Add / Edit Transaction Modal ("Add Money Activity" - Requirement #1)
    const renderAddTxnModal = () => {
      if (!isAddTxnOpen) return null;

      return h(AddTxnModalDialog, {
        txn: editingTxn,
        defaultDate: selectedDate,
        categories,
        goals,
        paymentMethods: DEFAULT_PAYMENT_METHODS,
        currency: profile.currency,
        onClose: () => {
          setIsAddTxnOpen(false);
          setEditingTxn(null);
        },
        onSave: handleSaveTransaction,
        onDelete: (txnToDelete) => {
          handleDeleteTxn(txnToDelete.id);
        }
      });
    };

    // Create / Edit Goal Modal (Requirement #4)
    const renderGoalModal = () => {
      if (!isAddGoalOpen) return null;

      return h(CreateGoalModalDialog, {
        goal: editingGoal,
        currency: profile.currency,
        onClose: () => {
          setIsAddGoalOpen(false);
          setEditingGoal(null);
        },
        onSave: handleSaveGoal
      });
    };

    // Add Contribution Modal
    const renderContributionModal = () => {
      if (!activeGoalForContrib) return null;

      return h(GoalContribModalDialog, {
        goal: activeGoalForContrib,
        currency: profile.currency,
        onClose: () => setActiveGoalForContrib(null),
        onSave: (amount, notes) => handleAddContribution(activeGoalForContrib.id, amount, notes)
      });
    };

    // Category Budget Modal
    const renderCatBudgetModal = () => {
      if (!isCatBudgetModalOpen) return null;

      return h(CatBudgetModalDialog, {
        categories: categories.filter((c) => c.type === 'EXPENSE'),
        categoryBudgets,
        currency: profile.currency,
        onClose: () => setIsCatBudgetModalOpen(false),
        onSave: handleSaveCatBudget
      });
    };

    // ⋯ Transaction Action Menu Modal (Requirement #2)
    const renderTxnMenuModal = () => {
      if (!activeTxnForMenu) return null;

      return h(TxnActionMenuDialog, {
        txn: activeTxnForMenu,
        currency: profile.currency,
        onClose: () => setActiveTxnForMenu(null),
        onEdit: () => {
          setEditingTxn(activeTxnForMenu);
          setActiveTxnForMenu(null);
          setIsAddTxnOpen(true);
        },
        onDuplicate: () => {
          handleDuplicateTxn(activeTxnForMenu);
          setActiveTxnForMenu(null);
        },
        onDelete: () => {
          setDeletingTxnId(activeTxnForMenu.id);
          setActiveTxnForMenu(null);
        }
      });
    };

    // Delete Confirmation Dialog
    const renderConfirmDeleteDialog = () => {
      if (!deletingTxnId) return null;

      return h('div', { className: 'modal-backdrop' },
        h('div', { className: 'bottom-sheet-card', style: { maxWidth: '400px' } },
          h('div', { className: 'sheet-header' },
            h('div', { className: 'sheet-title', style: { color: 'var(--overspent-red)' } }, 'Confirm Deletion'),
            h('button', { type: 'button', className: 'sheet-close-btn', onClick: () => setDeletingTxnId(null) }, '✕')
          ),
          h('p', { style: { color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', lineHeight: 1.5 } },
            'Are you sure you want to delete this transaction record? This will immediately recalculate your balances and budget.'
          ),
          h('div', { className: 'sheet-actions' },
            h('button', { type: 'button', className: 'cancel-btn', onClick: () => setDeletingTxnId(null) }, 'Cancel'),
            h('button', {
              type: 'button',
              className: 'submit-btn',
              style: { background: 'var(--overspent-red)', color: '#fff' },
              onClick: () => handleDeleteTxn(deletingTxnId)
            }, 'Delete Record')
          )
        )
      );
    };

    // Data & Cloud Sync Modal (Requirement #7)
    const renderDataSyncModal = () => {
      if (!isDataSyncOpen) return null;

      const currentState = {
        timestamp: Date.now(),
        profile,
        transactions,
        categories,
        goals,
        contributions,
        monthlyBudgetLimit,
        categoryBudgets,
        recurringPayments,
        accounts,
        appLock: { enabled: appLock.enabled, pin: appLock.pin }
      };

      return h(DataSyncModalDialog, {
        config: supabaseConfig,
        liveSyncConnected,
        lastSyncTime,
        currentState,
        onPullGit: () => pullFromGit(true),
        onPushGit: async (token) => {
          try {
            showToast('🚀 Pushing commit to GitHub repository...');
            await commitToGitHub(token, currentState);
            setLiveSyncConnected(true);
            setLastSyncTime(new Date());
            showToast('✅ Committed & pushed to GitHub main branch!');
          } catch (err) {
            showToast('❌ Git commit failed: ' + (err.message || 'Error'));
          }
        },
        onForceSync: () => {
          pullFromGit(true);
          pushCurrentStateToServer();
        },
        onImportData: (imported) => {
          applyIncomingData(imported, true);
        },
        onClose: () => setIsDataSyncOpen(false),
        onSave: (newConfig) => {
          setSupabaseConfig(newConfig);
          setIsDataSyncOpen(false);
          showToast('Cloud database settings saved.');
        }
      });
    };

    // Danger Zone Clear Confirmation Modal (Requirement #7)
    const renderDangerClearModal = () => {
      if (!isDangerZoneOpen) return null;

      return h(DangerClearModalDialog, {
        onClose: () => setIsDangerZoneOpen(false),
        onConfirm: handleClearAll
      });
    };

    // App Lock Setup Modal (Requirement #10)
    const renderAppLockSetupModal = () => {
      if (!isAppLockSetupOpen) return null;

      return h(AppLockSetupDialog, {
        onClose: () => setIsAppLockSetupOpen(false),
        onSave: (newPin) => {
          setAppLock({ enabled: true, pin: newPin, isLocked: false });
          setIsAppLockSetupOpen(false);
          showToast('App Lock PIN enabled!');
        }
      });
    };

    // Create or Edit Recurring Transaction Modal
    const renderRecurringModal = () => {
      if (!isAddRecurringOpen) return null;

      return h(CreateRecurringModalDialog, {
        categories,
        accounts,
        currency: profile.currency,
        initialData: editingRecurring,
        onClose: () => {
          setIsAddRecurringOpen(false);
          setEditingRecurring(null);
        },
        onSave: handleSaveRecurringPayment,
        onDelete: handleDeleteRecurringPayment
      });
    };

    // =========================================================================
    // MAIN APP RENDER
    // =========================================================================

    // If App Lock is active and locked, render Lock Screen Overlay
    if (appLock.enabled && appLock.isLocked) {
      return h('div', { className: 'lock-screen-overlay' },
        h('div', { className: 'lock-logo' }, '🔒'),
        h('div', { className: 'lock-title' }, 'Expense Tracker'),
        h('div', { className: 'lock-sub' }, 'Enter your 4-digit PIN to unlock'),
        h('div', { className: 'pin-dots' },
          [0, 1, 2, 3].map((i) =>
            h('div', { key: i, className: `pin-dot ${pinAttempt.length > i ? 'filled' : ''}` })
          )
        ),
        h('div', { className: 'pin-keypad' },
          ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) =>
            h('button', {
              key: k,
              type: 'button',
              className: 'pin-key',
              onClick: () => {
                if (k === 'C') setPinAttempt('');
                else if (k === '⌫') setPinAttempt((prev) => prev.slice(0, -1));
                else handlePinInput(k);
              }
            }, k)
          )
        )
      );
    }

    return h('div', { className: 'app-container' },
      // Top Header (Adaptive 2-row on mobile)
      h('header', { className: 'app-header' },
        h('div', { className: 'header-left' },
          h('div', { className: 'logo-badge' }, '💎'),
          h('div', { className: 'brand-info' },
            h('h1', null, 'Expense ', h('span', null, 'Tracker')),
            h('div', { className: 'brand-tagline' }, 'PLAN · TRACK · SAVE · GROW'),
            h('div', { className: 'header-greeting' }, getGreeting(profile.name))
          )
        ),

        // Month Selector
        h('div', { className: 'month-selector' },
          h('button', {
            type: 'button',
            className: 'month-nav-btn',
            onClick: handlePrevMonth,
            title: 'Previous Month'
          }, '‹'),
          h('div', { className: 'current-month-label' }, `${getMonthName(viewMonth - 1)} ${viewYear}`),
          h('button', {
            type: 'button',
            className: 'month-nav-btn',
            onClick: handleNextMonth,
            title: 'Next Month'
          }, '›'),
          h('button', {
            type: 'button',
            className: 'today-jump-btn',
            onClick: handleJumpToday,
            title: 'Jump to Current Month'
          }, 'Today')
        ),

        // Header Right: LIVE GIT SYNC & OFFLINE INDICATOR
        h('div', { className: 'header-right' },
          liveSyncConnected
            ? h('button', {
                type: 'button',
                className: 'sync-status-badge live-sync-btn',
                title: 'Git-Synchronized. Tap to pull latest from Git.',
                onClick: () => pullFromGit(true)
              },
                h('span', { className: 'sync-dot' }),
                'Git Synced'
              )
            : !isOnline
            ? h('div', { className: 'sync-status-badge', style: { color: 'var(--warning-amber)' } },
                h('span', { className: 'sync-dot offline' }),
                'Offline'
              )
            : h('button', {
                type: 'button',
                className: 'sync-status-badge live-sync-btn offline-state',
                title: 'Tap to fetch data from Git repository',
                onClick: () => pullFromGit(true)
              },
                h('span', { className: 'sync-dot offline' }),
                'Sync Git'
              )
        )
      ),

      // Page Views
      activeTab === 'HOME' && renderHomeView(),
      activeTab === 'TRANSACTIONS' && renderTransactionsView(),
      activeTab === 'GOALS' && renderGoalsView(),
      activeTab === 'BUDGET' && renderBudgetView(),
      activeTab === 'FIXED_PAYMENTS' && renderFixedPaymentsView(),
      activeTab === 'REPORTS' && renderReportsView(),
      activeTab === 'MORE' && renderMoreView(),

      // Modals
      renderDayDetailsModal(),
      renderAddTxnModal(),
      renderGoalModal(),
      renderContributionModal(),
      renderCatBudgetModal(),
      renderTxnMenuModal(),
      renderConfirmDeleteDialog(),
      renderDataSyncModal(),
      renderDangerClearModal(),
      renderAppLockSetupModal(),
      renderRecurringModal(),

      // Toast Notification
      toastMessage && h('div', { className: 'toast-msg' }, toastMessage),

      // PROMINENT FLOATING + ACTION BUTTON (Requirement #1)
      h('button', {
        type: 'button',
        className: 'fab-btn',
        title: 'Add Money Activity',
        onClick: () => {
          setEditingTxn(null);
          setIsAddTxnOpen(true);
        }
      }, '+'),

      // Fixed Mobile Bottom Navigation Bar: HOME | TRANSACTIONS | GOALS | BUDGET | REPORTS | MORE (Requirement #4)
      h('nav', { className: 'bottom-nav' },
        [
          { id: 'HOME', icon: '🏠', label: 'Home' },
          { id: 'TRANSACTIONS', icon: '📋', label: 'Trans.' },
          { id: 'GOALS', icon: '🎯', label: 'Goals' },
          { id: 'BUDGET', icon: '📊', label: 'Budget' },
          { id: 'REPORTS', icon: '📈', label: 'Reports' },
          { id: 'MORE', icon: '⚙️', label: 'More' }
        ].map((item) => {
          const isItemActive = activeTab === item.id || (item.id === 'MORE' && activeTab === 'FIXED_PAYMENTS');
          return h('button', {
            key: item.id,
            type: 'button',
            className: `nav-item ${isItemActive ? 'active' : ''}`,
            onClick: () => setActiveTab(item.id)
          },
            h('span', { className: 'nav-icon' }, item.icon),
            h('span', { className: 'nav-label' }, item.label)
          );
        })
      )
    );
  }

  // ===========================================================================
  // MODAL DIALOG COMPONENTS
  // ===========================================================================

  // Day Details & Edit Popup Modal Dialog (Opens when selecting a day or clicking Date Edit Option)
  function DayDetailsModalDialog({
    dateStr,
    dateInfo,
    dateStats,
    transactions,
    currency,
    onClose,
    onEditTxn,
    onAddTxn,
    onDeleteTxn
  }) {
    // Filter transactions specifically for this date
    const dayTxns = transactions.filter((t) => t.date === dateStr);

    return h('div', { className: 'modal-backdrop', onClick: onClose },
      h('div', {
        className: 'day-details-sheet-card',
        onClick: (e) => e.stopPropagation()
      },
        // Header
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title', style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h('span', null, '📅'),
            h('div', null,
              h('div', { style: { fontSize: '16px', fontWeight: 900 } }, dateInfo.formatted),
              h('div', { style: { fontSize: '11.5px', color: 'var(--text-dim)', fontWeight: 600 } }, dateInfo.weekday)
            )
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        // Date Financial Summary Banner (Dynamically calculated)
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            padding: '12px 10px',
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            margin: '12px 0 16px',
            textAlign: 'center'
          }
        },
          h('div', null,
            h('div', { style: { fontSize: '10.5px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' } }, 'Income'),
            h('div', { style: { fontSize: '14px', fontWeight: 900, color: 'var(--income-green)', marginTop: '2px' } },
              `+${formatCurrency(dateStats.income, currency)}`
            )
          ),
          h('div', null,
            h('div', { style: { fontSize: '10.5px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' } }, 'Expenses'),
            h('div', { style: { fontSize: '14px', fontWeight: 900, color: 'var(--expense-pink)', marginTop: '2px' } },
              formatCurrency(dateStats.expenses, currency)
            )
          ),
          h('div', null,
            h('div', { style: { fontSize: '10.5px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' } }, 'Net'),
            h('div', {
              style: {
                fontSize: '14px',
                fontWeight: 900,
                marginTop: '2px',
                color: dateStats.net > 0 ? 'var(--neon-green)' : dateStats.net < 0 ? 'var(--expense-pink)' : 'var(--text-muted)'
              }
            }, `${dateStats.net > 0 ? '+' : ''}${formatCurrency(dateStats.net, currency)}`)
          )
        ),

        // Prominent Button: Add Transaction for this day
        h('div', { style: { marginBottom: '14px' } },
          h('button', {
            type: 'button',
            className: 'submit-btn',
            style: {
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px',
              fontSize: '13.5px',
              fontWeight: 800
            },
            onClick: () => {
              onClose();
              onAddTxn();
            }
          }, `➕ Add Transaction for ${dateInfo.formatted}`)
        ),

        // Transactions Header
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            paddingBottom: '6px',
            borderBottom: '1px solid var(--border-subtle)'
          }
        },
          h('span', { style: { fontSize: '12px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' } },
            `Transactions (${dayTxns.length})`
          ),
          h('span', { style: { fontSize: '11px', color: 'var(--text-dim)' } }, 'Click any item or Edit to modify')
        ),

        // List of transactions for this day
        dayTxns.length === 0
          ? h('div', { className: 'empty-state', style: { padding: '24px 12px' } },
              h('span', { className: 'empty-icon' }, '📅'),
              h('div', { className: 'empty-title', style: { fontSize: '14px' } }, `No transactions on ${dateInfo.formatted}`),
              h('div', { className: 'empty-desc', style: { fontSize: '12px' } }, 'Use the button above to log your spending or income for this day.')
            )
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              dayTxns.map((t) =>
                h('div', {
                  key: t.id,
                  className: 'txn-card clickable',
                  style: { margin: 0, padding: '12px', background: 'rgba(255, 255, 255, 0.03)' },
                  onClick: () => {
                    onClose();
                    onEditTxn(t);
                  }
                },
                  h('div', { className: 'txn-left' },
                    h('div', { className: 'txn-cat-icon' }, t.categoryIcon || '📦'),
                    h('div', { className: 'txn-details' },
                      h('div', { className: 'txn-desc' }, t.description),
                      h('div', { className: 'txn-meta' },
                        h('span', { className: 'txn-pill' }, t.categoryName || 'Other'),
                        h('span', { className: 'txn-pill' }, t.paymentMethod || 'UPI'),
                        t.time ? h('span', { className: 'txn-pill' }, formatTimeAMPM(t.time)) : null,
                        t.source === 'SMS'
                          ? h('span', { className: 'source-badge sms' }, '📱 SMS' + (t.isEdited ? ' · Edited' : ''))
                          : t.source === 'IMPORT'
                          ? h('span', { className: 'source-badge import' }, '📥 Import')
                          : t.isRecurring
                          ? h('span', { className: 'source-badge recurring' }, '🔄 Auto')
                          : h('span', { className: 'source-badge manual' }, '✏️ Manual')
                      ),
                      t.notes ? h('div', { style: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' } }, t.notes) : null
                    )
                  ),
                  h('div', { className: 'txn-right', style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' } },
                    h('div', { className: `txn-amount ${t.type.toLowerCase()}` },
                      `${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount, currency)}`
                    ),
                    h('div', { style: { display: 'flex', gap: '6px' } },
                      h('button', {
                        type: 'button',
                        className: 'day-txn-action-btn edit',
                        title: 'Edit this transaction',
                        onClick: (e) => {
                          e.stopPropagation();
                          onClose();
                          onEditTxn(t);
                        }
                      }, '✏️ Edit'),
                      h('button', {
                        type: 'button',
                        className: 'day-txn-action-btn delete',
                        title: 'Delete this transaction',
                        onClick: (e) => {
                          e.stopPropagation();
                          onDeleteTxn(t);
                        }
                      }, '🗑️')
                    )
                  )
                )
              )
            )
      )
    );
  }

  // Add / Edit Transaction Modal Dialog (Requirements #4, #5, #6, #7, #14, #15, #16)
  function AddTxnModalDialog({ txn, defaultDate, categories, goals, paymentMethods, currency, onClose, onSave, onDelete }) {
    const isEdit = Boolean(txn);
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().slice(0, 5);

    const [type, setType] = useState(txn?.type || 'EXPENSE');
    const [amount, setAmount] = useState(txn ? String(txn.amount) : '');
    const [categoryId, setCategoryId] = useState(txn?.categoryId || 'cat-food');
    const [selectedGoalId, setSelectedGoalId] = useState(txn?.goalId || goals[0]?.id || '');
    const [date, setDate] = useState(txn?.date || defaultDate || todayStr);
    const [time, setTime] = useState(txn?.time || timeStr);
    const [paymentMethod, setPaymentMethod] = useState(txn?.paymentMethod || 'UPI');
    const [description, setDescription] = useState(txn?.description || '');
    const [notes, setNotes] = useState(txn?.notes || '');
    const [isRecurring, setIsRecurring] = useState(txn?.isRecurring || false);
    const [updateRecurringTemplate, setUpdateRecurringTemplate] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const filteredCategories = categories.filter((c) => {
      if (type === 'INCOME') return c.type === 'INCOME';
      return c.type === 'EXPENSE';
    });

    const handleFormSubmit = (e) => {
      e.preventDefault();
      const numAmt = safeRound(parseFloat(amount));
      if (isNaN(numAmt) || numAmt <= 0) {
        alert('Please enter a valid amount.');
        return;
      }

      let finalDesc = description.trim();
      let cat = categories.find((c) => c.id === categoryId) || filteredCategories[0];

      if (type === 'FUND_CONTRIBUTION') {
        const goal = goals.find((g) => g.id === selectedGoalId);
        finalDesc = finalDesc || (goal ? `Contribution to ${goal.name}` : 'Goal Contribution');
      } else if (!finalDesc) {
        alert('Please enter a description / merchant.');
        return;
      }

      onSave({
        type,
        amount: numAmt,
        categoryId: type === 'FUND_CONTRIBUTION' ? 'cat-bills' : cat ? cat.id : 'cat-other-exp',
        categoryName: type === 'FUND_CONTRIBUTION' ? 'Goal Allocation' : cat ? cat.name : 'Other',
        categoryIcon: type === 'FUND_CONTRIBUTION' ? '🎯' : cat ? cat.icon : '📦',
        categoryColor: '#00f59b',
        goalId: type === 'FUND_CONTRIBUTION' ? selectedGoalId : null,
        date,
        time,
        paymentMethod,
        description: finalDesc,
        notes: notes.trim(),
        isRecurring,
        updateRecurringTemplate: Boolean(updateRecurringTemplate && isRecurring)
      });
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card' },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, isEdit ? '✏️' : '➕'),
            isEdit ? ' Edit Transaction' : ' Add Money Activity'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        // Source metadata display (Requirement #14)
        isEdit &&
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              marginBottom: '14px',
              border: '1px solid var(--border-subtle)'
            }
          },
            h('div', { style: { fontSize: '12px', color: 'var(--text-dim)' } }, 'Record Source:'),
            txn.source === 'SMS'
              ? h('span', { className: 'source-badge sms' }, '📱 SMS (Auto-detected)' + (txn.isEdited ? ' · Edited' : ''))
              : txn.source === 'IMPORT'
              ? h('span', { className: 'source-badge import' }, '📥 Imported File')
              : txn.isRecurring
              ? h('span', { className: 'source-badge recurring' }, '🔄 Auto Recurring')
              : h('span', { className: 'source-badge manual' }, '✏️ Manual Entry')
          ),

        // Type Segmented Control (Requirements #1 & #4)
        h('div', { className: 'type-segmented-control' },
          [
            { id: 'EXPENSE', label: 'Expense' },
            { id: 'INCOME', label: 'Income' },
            { id: 'REFUND', label: 'Refund' },
            { id: 'TRANSFER', label: 'Transfer' },
            { id: 'FUND_CONTRIBUTION', label: 'Savings Goal' }
          ].map((t) =>
            h('button', {
              key: t.id,
              type: 'button',
              className: `type-tab-btn ${type === t.id ? `active ${t.id}` : ''}`,
              onClick: () => {
                setType(t.id);
                if (t.id === 'INCOME') setCategoryId('cat-salary');
                else if (t.id === 'EXPENSE' || t.id === 'REFUND') setCategoryId('cat-food');
              }
            }, t.label)
          )
        ),

        h('form', { onSubmit: handleFormSubmit },
          // Amount Field with Quick Chips
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, `Amount (${currency}) *`),
            h('input', {
              type: 'number',
              step: 'any',
              min: '1',
              required: true,
              placeholder: '0',
              className: 'form-input',
              style: { fontSize: '24px', fontWeight: 900, color: '#fff' },
              value: amount,
              onChange: (e) => setAmount(e.target.value)
            }),
            h('div', { className: 'quick-chips' },
              [50, 100, 500, 1000].map((inc) =>
                h('button', {
                  key: inc,
                  type: 'button',
                  className: 'chip-btn',
                  onClick: () => setAmount(String((parseFloat(amount) || 0) + inc))
                }, `+${inc}`)
              )
            )
          ),

          // If Savings Goal selected, pick which Goal
          type === 'FUND_CONTRIBUTION'
            ? h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Allocate to Savings Goal *'),
                h('select', {
                  className: 'form-select',
                  value: selectedGoalId,
                  onChange: (e) => setSelectedGoalId(e.target.value)
                },
                  goals.map((g) => h('option', { key: g.id, value: g.id }, `${g.icon || '🎯'} ${g.name}`))
                )
              )
            : null,

          // Description
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Description / Merchant *'),
            h('input', {
              type: 'text',
              required: type !== 'FUND_CONTRIBUTION',
              placeholder: type === 'FUND_CONTRIBUTION' ? 'Optional memo' : 'e.g. Petrol, Groceries, Dinner, Salary',
              className: 'form-input',
              value: description,
              onChange: (e) => setDescription(e.target.value)
            })
          ),

          // Category & Payment Row (For Expense & Income)
          type !== 'FUND_CONTRIBUTION' && type !== 'TRANSFER'
            ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
                h('div', { className: 'form-group' },
                  h('label', { className: 'form-label' }, 'Category *'),
                  h('select', {
                    className: 'form-select',
                    value: categoryId,
                    onChange: (e) => setCategoryId(e.target.value)
                  },
                    filteredCategories.map((c) =>
                      h('option', { key: c.id, value: c.id }, `${c.icon} ${c.name}`)
                    )
                  )
                ),
                h('div', { className: 'form-group' },
                  h('label', { className: 'form-label' }, 'Payment Account'),
                  h('select', {
                    className: 'form-select',
                    value: paymentMethod,
                    onChange: (e) => setPaymentMethod(e.target.value)
                  },
                    paymentMethods.map((pm) => h('option', { key: pm, value: pm }, pm))
                  )
                )
              )
            : h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Payment Mode'),
                h('select', {
                  className: 'form-select',
                  value: paymentMethod,
                  onChange: (e) => setPaymentMethod(e.target.value)
                },
                  paymentMethods.map((pm) => h('option', { key: pm, value: pm }, pm))
                )
              ),

          // Date & Time Row (Requirement #5: Date field opens calendar and moves transaction on save)
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('span', null, 'Date (opens calendar) *'),
                h('span', { style: { color: 'var(--neon-green)', fontSize: '11px', fontWeight: 600 } }, formatFullDate(date).formatted)
              ),
              h('input', {
                type: 'date',
                required: true,
                className: 'form-input',
                value: date,
                onClick: (e) => {
                  if (e.target && typeof e.target.showPicker === 'function') {
                    try { e.target.showPicker(); } catch {}
                  }
                },
                onChange: (e) => setDate(e.target.value)
              })
            ),
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Time'),
              h('input', {
                type: 'time',
                className: 'form-input',
                value: time,
                onChange: (e) => setTime(e.target.value)
              })
            )
          ),

          // Recurring Options (Requirement #16)
          txn && txn.isRecurring
            ? h('div', {
                style: {
                  padding: '10px 12px',
                  background: 'rgba(0, 245, 155, 0.05)',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  border: '1px solid rgba(0, 245, 155, 0.2)'
                }
              },
                h('div', { style: { fontSize: '12px', fontWeight: 800, color: 'var(--neon-green)', marginBottom: '6px' } }, '🔄 Recurring Payment'),
                h('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fff', cursor: 'pointer' } },
                  h('input', {
                    type: 'checkbox',
                    checked: updateRecurringTemplate,
                    onChange: (e) => setUpdateRecurringTemplate(e.target.checked)
                  }),
                  'Also update future recurring payment rule amount'
                )
              )
            : null,

          // Notes
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Optional Notes'),
            h('input', {
              type: 'text',
              placeholder: 'Additional details or memo...',
              className: 'form-input',
              value: notes,
              onChange: (e) => setNotes(e.target.value)
            })
          ),

          // Action Buttons with Prominent SAVE CHANGES (Requirement #6)
          h('div', { className: 'sheet-actions' },
            h('button', { type: 'button', className: 'cancel-btn', onClick: onClose }, 'Cancel'),
            h('button', {
              type: 'submit',
              className: 'submit-btn',
              style: { fontWeight: 900, letterSpacing: '0.02em' }
            }, isEdit ? 'SAVE CHANGES' : 'RECORD ACTIVITY')
          ),

          // Delete Transaction inside Edit Form (Requirement #7)
          isEdit &&
            h('div', { style: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' } },
              h('button', {
                type: 'button',
                className: 'danger-btn',
                style: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
                onClick: () => setShowDeleteConfirm(true)
              }, '🗑️ Delete Transaction')
            )
        ),

        // Delete Confirmation Modal Overlay (Requirement #7)
        showDeleteConfirm &&
          h('div', { className: 'modal-backdrop', style: { zIndex: 100000 } },
            h('div', { className: 'bottom-sheet-card', style: { maxWidth: '380px', border: '1px solid var(--overspent-red)' } },
              h('div', { className: 'sheet-header' },
                h('div', { className: 'sheet-title', style: { color: 'var(--overspent-red)' } }, 'Delete this transaction?'),
                h('button', { type: 'button', className: 'sheet-close-btn', onClick: () => setShowDeleteConfirm(false) }, '✕')
              ),
              h('p', { style: { color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '20px', lineHeight: 1.5 } },
                'This action cannot be undone.'
              ),
              h('div', { className: 'sheet-actions' },
                h('button', {
                  type: 'button',
                  className: 'cancel-btn',
                  onClick: () => setShowDeleteConfirm(false)
                }, 'CANCEL'),
                h('button', {
                  type: 'button',
                  className: 'danger-btn',
                  onClick: () => {
                    setShowDeleteConfirm(false);
                    onClose();
                    if (onDelete) onDelete(txn);
                  }
                }, 'DELETE')
              )
            )
          )
      )
    );
  }

  // ⋯ Transaction Action Menu Modal Dialog (Requirement #2)
  function TxnActionMenuDialog({ txn, currency, onClose, onEdit, onDuplicate, onDelete }) {
    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '380px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, txn.categoryIcon || '📋'),
            ` ${txn.description}`
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('div', { style: { marginBottom: '14px', fontSize: '13px', color: 'var(--text-muted)' } },
          `${formatCurrency(txn.amount, currency)} · ${txn.date} · ${txn.categoryName || 'Other'}`
        ),

        h('button', {
          type: 'button',
          className: 'txn-action-sheet-item',
          onClick: onEdit
        },
          h('span', null, '✏️'),
          'Edit Transaction'
        ),

        h('button', {
          type: 'button',
          className: 'txn-action-sheet-item',
          onClick: onDuplicate
        },
          h('span', null, '📋'),
          'Duplicate Transaction (Copy to Today)'
        ),

        h('button', {
          type: 'button',
          className: 'txn-action-sheet-item delete',
          onClick: onDelete
        },
          h('span', null, '🗑️'),
          'Delete Transaction'
        ),

        h('div', { style: { marginTop: '12px' } },
          h('button', { type: 'button', className: 'cancel-btn', style: { width: '100%' }, onClick: onClose }, 'Close')
        )
      )
    );
  }

  // Create / Edit Goal Modal Dialog (Requirement #4)
  function CreateGoalModalDialog({ goal, currency, onClose, onSave }) {
    const isEdit = Boolean(goal);
    const [name, setName] = useState(goal?.name || '');
    const [icon, setIcon] = useState(goal?.icon || '🎯');
    const [targetAmount, setTargetAmount] = useState(goal ? String(goal.targetAmount) : '');
    const [currentAmount, setCurrentAmount] = useState(goal ? String(goal.currentAmount) : '0');
    const [contributionAmount, setContributionAmount] = useState(goal ? String(goal.contributionAmount) : '1000');
    const [frequency, setFrequency] = useState(goal?.frequency || 'MONTHLY');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!name.trim()) return alert('Please enter a goal name.');
      const tAmt = safeRound(parseFloat(targetAmount));
      if (isNaN(tAmt) || tAmt <= 0) return alert('Please enter a target amount.');

      onSave({
        name: name.trim(),
        icon,
        targetAmount: tAmt,
        currentAmount: safeRound(parseFloat(currentAmount) || 0),
        contributionAmount: safeRound(parseFloat(contributionAmount) || 0),
        frequency
      });
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '440px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, '🎯'),
            isEdit ? ' Edit Savings Goal' : ' Create Savings Goal'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('form', { onSubmit: handleSubmit },
          h('div', { style: { display: 'grid', gridTemplateColumns: '70px 1fr', gap: '10px' } },
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Icon'),
              h('select', {
                className: 'form-select',
                value: icon,
                onChange: (e) => setIcon(e.target.value)
              },
                ['🎯', '🛡️', '🏖️', '💻', '🚗', '🏠', '💍', '💰', '🎓'].map((ic) =>
                  h('option', { key: ic, value: ic }, ic)
                )
              )
            ),
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Goal Name *'),
              h('input', {
                type: 'text',
                required: true,
                placeholder: 'e.g. Emergency Fund, Laptop, Vacation',
                className: 'form-input',
                value: name,
                onChange: (e) => setName(e.target.value)
              })
            )
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, `Target Amount (${currency}) *`),
            h('input', {
              type: 'number',
              required: true,
              placeholder: '50000',
              className: 'form-input',
              value: targetAmount,
              onChange: (e) => setTargetAmount(e.target.value)
            })
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, `Already Saved (${currency})`),
              h('input', {
                type: 'number',
                className: 'form-input',
                value: currentAmount,
                onChange: (e) => setCurrentAmount(e.target.value)
              })
            ),
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Planned Contribution'),
              h('input', {
                type: 'number',
                className: 'form-input',
                value: contributionAmount,
                onChange: (e) => setContributionAmount(e.target.value)
              })
            )
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Contribution Frequency'),
            h('select', {
              className: 'form-select',
              value: frequency,
              onChange: (e) => setFrequency(e.target.value)
            },
              h('option', { value: 'WEEKLY' }, 'Weekly'),
              h('option', { value: 'MONTHLY' }, 'Monthly'),
              h('option', { value: 'YEARLY' }, 'Yearly')
            )
          ),

          h('div', { className: 'sheet-actions' },
            h('button', { type: 'button', className: 'cancel-btn', onClick: onClose }, 'Cancel'),
            h('button', { type: 'submit', className: 'submit-btn' }, isEdit ? 'Save Changes' : 'Create Goal')
          )
        )
      )
    );
  }

  // Goal Contribution Modal Dialog
  function GoalContribModalDialog({ goal, currency, onClose, onSave }) {
    const [amount, setAmount] = useState(String(goal?.contributionAmount || '1000'));
    const [notes, setNotes] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(amount, notes);
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '400px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, goal.icon || '🎯'),
            ` Add to ${goal.name}`
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('form', { onSubmit: handleSubmit },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, `Contribution Amount (${currency}) *`),
            h('input', {
              type: 'number',
              required: true,
              min: '1',
              className: 'form-input',
              value: amount,
              onChange: (e) => setAmount(e.target.value)
            })
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Notes (optional)'),
            h('input', {
              type: 'text',
              placeholder: 'Memo for this allocation',
              className: 'form-input',
              value: notes,
              onChange: (e) => setNotes(e.target.value)
            })
          ),

          h('div', { className: 'sheet-actions' },
            h('button', { type: 'button', className: 'cancel-btn', onClick: onClose }, 'Cancel'),
            h('button', { type: 'submit', className: 'submit-btn' }, 'Record Contribution')
          )
        )
      )
    );
  }

  // Category Budget Modal Dialog
  function CatBudgetModalDialog({ categories, categoryBudgets, currency, onClose, onSave }) {
    const [catId, setCatId] = useState(categories[0]?.id || 'cat-food');
    const existing = categoryBudgets.find((cb) => cb.categoryId === catId)?.limitAmount || '';
    const [limit, setLimit] = useState(existing ? String(existing) : '5000');

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(catId, limit);
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '420px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, '🎯'),
            ' Category Budget Limit'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('form', { onSubmit: handleSubmit },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Category *'),
            h('select', {
              className: 'form-select',
              value: catId,
              onChange: (e) => {
                setCatId(e.target.value);
                const found = categoryBudgets.find((cb) => cb.categoryId === e.target.value)?.limitAmount;
                setLimit(found ? String(found) : '5000');
              }
            },
              categories.map((c) => h('option', { key: c.id, value: c.id }, `${c.icon} ${c.name}`))
            )
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, `Monthly Spending Limit (${currency}) *`),
            h('input', {
              type: 'number',
              required: true,
              min: '100',
              className: 'form-input',
              value: limit,
              onChange: (e) => setLimit(e.target.value)
            })
          ),

          h('div', { className: 'sheet-actions' },
            h('button', { type: 'button', className: 'cancel-btn', onClick: onClose }, 'Cancel'),
            h('button', { type: 'submit', className: 'submit-btn' }, 'Save Limit')
          )
        )
      )
    );
  }

  // Clean Data & Git Synchronization Modal Dialog
  function DataSyncModalDialog({ config, liveSyncConnected, lastSyncTime, currentState, onPullGit, onPushGit, onForceSync, onClose, onSave }) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [url, setUrl] = useState(config.url || '');
    const [anonKey, setAnonKey] = useState(config.anonKey || '');
    const [ghPat, setGhPat] = useState(() => {
      try { return localStorage.getItem('exptrk_github_pat') || ''; } catch { return ''; }
    });
    const [isPushing, setIsPushing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);

    const handleSavePat = () => {
      try {
        localStorage.setItem('exptrk_github_pat', ghPat.trim());
      } catch {}
    };

    const handleDownloadJson = () => {
      try {
        const jsonStr = JSON.stringify(currentState, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'shared_store.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        alert('Download failed: ' + err.message);
      }
    };

    const handleSave = () => {
      onSave({
        url: url.trim(),
        anonKey: anonKey.trim(),
        isConnected: Boolean(url.trim() && anonKey.trim()),
        lastSync: new Date().toISOString()
      });
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '440px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, '☁️'),
            ' Git & Cloud Data Sync'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        // Git Sync Status Card
        h('div', { className: 'stat-widget', style: { marginBottom: '16px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' } },
            h('span', { className: `sync-dot ${liveSyncConnected ? '' : 'offline'}` }),
            h('strong', { style: { color: '#fff', fontSize: '14px' } },
              liveSyncConnected ? 'Git Synchronization Active 🟢' : 'Connecting to Git...'
            )
          ),
          h('div', { style: { fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '6px' } },
            'Repository: ',
            h('strong', { style: { color: 'var(--neon-green)' } }, 'Radhadevan/expense-tracker'),
            ' (branch: main)'
          ),
          h('div', { style: { fontSize: '11.5px', color: 'var(--text-dim)' } },
            `Data file: data/shared_store.json • Last checked: ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Just now'}`
          )
        ),

        // Primary Action: Pull Latest from Git
        h('button', {
          type: 'button',
          className: 'submit-btn',
          style: { width: '100%', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
          disabled: isPulling,
          onClick: async () => {
            setIsPulling(true);
            if (onPullGit) await onPullGit();
            setIsPulling(false);
          }
        }, isPulling ? '🔄 Fetching Git...' : '⚡ Pull Latest from Git'),

        // Git Direct Push Section
        h('div', { className: 'form-group', style: { marginBottom: '14px' } },
          h('label', { className: 'form-label' }, 'GitHub Personal Access Token (for Mobile Push to Git)'),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('input', {
              type: 'password',
              className: 'form-input',
              style: { flex: 1, fontSize: '13px' },
              value: ghPat,
              placeholder: 'ghp_xxxxxxxxxxxx',
              onChange: (e) => setGhPat(e.target.value)
            }),
            h('button', {
              type: 'button',
              className: 'secondary-btn',
              style: { padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap' },
              onClick: () => {
                handleSavePat();
                alert('GitHub token saved to local storage.');
              }
            }, 'Save Token')
          ),
          h('div', { style: { fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' } },
            'Token with "repo" permission allows committing directly from your phone.'
          )
        ),

        // Push to Git button
        h('button', {
          type: 'button',
          className: 'secondary-btn',
          style: { width: '100%', marginBottom: '12px', borderColor: 'var(--border-subtle)', background: 'rgba(255,255,255,0.04)', color: '#fff' },
          disabled: isPushing,
          onClick: async () => {
            const tokenToUse = ghPat.trim() || localStorage.getItem('exptrk_github_pat');
            if (!tokenToUse) {
              alert('Please enter your GitHub Personal Access Token above first to push commits directly to Git.');
              return;
            }
            setIsPushing(true);
            handleSavePat();
            if (onPushGit) await onPushGit(tokenToUse);
            setIsPushing(false);
          }
        }, isPushing ? '🚀 Committing to Git...' : '🚀 Commit & Push to Git Repository'),

        // 1-Click Clipboard & File Backup Row
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' } },
          h('button', {
            type: 'button',
            className: 'secondary-btn',
            style: { fontSize: '12px', padding: '10px 6px' },
            onClick: () => {
              try {
                navigator.clipboard.writeText(JSON.stringify(currentState, null, 2));
                alert('📋 Copied all expense data to clipboard! Paste it on your other device.');
              } catch (_) {
                prompt('Copy this data:', JSON.stringify(currentState));
              }
            }
          }, '📋 Copy Data'),
          h('button', {
            type: 'button',
            className: 'secondary-btn',
            style: { fontSize: '12px', padding: '10px 6px' },
            onClick: () => {
              const text = prompt('Paste the expense JSON data here to import:');
              if (!text || !text.trim()) return;
              try {
                const parsed = JSON.parse(text);
                if (parsed && (parsed.transactions || parsed.profile)) {
                  if (onImportData) onImportData(parsed);
                  alert('✅ Successfully imported! Your data now matches the other device.');
                  onClose();
                } else {
                  alert('Invalid JSON structure.');
                }
              } catch (err) {
                alert('Error parsing JSON: ' + err.message);
              }
            }
          }, '📥 Paste & Import')
        ),

        // Download JSON button
        h('button', {
          type: 'button',
          className: 'secondary-btn',
          style: { width: '100%', marginBottom: '14px', fontSize: '12px' },
          onClick: handleDownloadJson
        }, '💾 Export data/shared_store.json'),

        // Wi-Fi Live Sync Box
        h('div', { className: 'stat-widget', style: { marginBottom: '14px', background: 'rgba(0, 245, 155, 0.05)', borderColor: 'rgba(0, 245, 155, 0.2)' } },
          h('div', { style: { fontSize: '12px', color: 'var(--neon-green)', fontWeight: 700, marginBottom: '4px' } }, '📶 Wi-Fi Instant Live Sync'),
          h('div', { style: { fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5 } },
            'When both devices are on the same home Wi-Fi, open ',
            h('strong', { style: { color: '#fff' } }, 'http://10.216.40.100:3000'),
            ' on your phone. Any addition or edit updates both screens in real-time.'
          )
        ),

        // Advanced Settings Expandable
        h('div', { style: { borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' } },
          h('button', {
            type: 'button',
            style: { background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '12px', cursor: 'pointer', padding: 0 },
            onClick: () => setShowAdvanced((a) => !a)
          }, showAdvanced ? '▾ Hide Advanced Cloud Config' : '▸ Advanced Cloud Configuration'),

          showAdvanced &&
            h('div', { style: { marginTop: '12px' } },
              h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Supabase Project URL'),
                h('input', {
                  type: 'text',
                  placeholder: 'https://xyzcompany.supabase.co',
                  className: 'form-input',
                  value: url,
                  onChange: (e) => setUrl(e.target.value)
                })
              ),
              h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Supabase Anon API Key'),
                h('input', {
                  type: 'password',
                  placeholder: 'eyJhbGciOi...',
                  className: 'form-input',
                  value: anonKey,
                  onChange: (e) => setAnonKey(e.target.value)
                })
              ),
              h('button', {
                type: 'button',
                className: 'submit-btn',
                style: { width: '100%', marginTop: '6px' },
                onClick: handleSave
              }, 'Save Cloud Credentials')
            )
        ),

        h('div', { className: 'sheet-actions', style: { marginTop: '16px' } },
          h('button', { type: 'button', className: 'cancel-btn', style: { width: '100%' }, onClick: onClose }, 'Close')
        )
      )
    );
  }

  // Danger Zone Clear Data Confirmation Modal Dialog (Requirement #7)
  function DangerClearModalDialog({ onClose, onConfirm }) {
    const [confirmText, setConfirmText] = useState('');

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '420px', border: '1px solid var(--overspent-red)' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title', style: { color: 'var(--overspent-red)' } },
            h('span', null, '⚠️'),
            ' Clear All Expense Data'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('p', { style: { color: '#fff', fontSize: '13.5px', lineHeight: 1.5, marginBottom: '14px' } },
          'This will permanently delete ALL recorded transactions, category entries, and savings contributions from this device.'
        ),

        h('p', { style: { color: 'var(--text-muted)', fontSize: '12.5px', marginBottom: '14px' } },
          'To proceed, please type ',
          h('strong', { style: { color: 'var(--overspent-red)' } }, 'DELETE'),
          ' in the box below:'
        ),

        h('input', {
          type: 'text',
          placeholder: 'Type DELETE to confirm',
          className: 'form-input',
          value: confirmText,
          onChange: (e) => setConfirmText(e.target.value),
          style: { marginBottom: '18px' }
        }),

        h('div', { className: 'sheet-actions' },
          h('button', { type: 'button', className: 'cancel-btn', onClick: onClose }, 'Cancel'),
          h('button', {
            type: 'button',
            className: 'danger-btn',
            disabled: confirmText !== 'DELETE',
            style: { opacity: confirmText === 'DELETE' ? 1 : 0.4, cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed' },
            onClick: onConfirm
          }, 'Erase Everything')
        )
      )
    );
  }

  // App Lock PIN Setup Dialog (Requirement #10)
  function AppLockSetupDialog({ onClose, onSave }) {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const handleSave = (e) => {
      e.preventDefault();
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return alert('PIN must be exactly 4 numeric digits.');
      }
      if (pin !== confirmPin) {
        return alert('PINs do not match.');
      }
      onSave(pin);
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '380px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, '🔒'),
            ' Set App Lock PIN'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('form', { onSubmit: handleSave },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, '4-Digit PIN'),
            h('input', {
              type: 'password',
              maxLength: 4,
              pattern: '\\d{4}',
              required: true,
              placeholder: '••••',
              className: 'form-input',
              style: { textAlign: 'center', letterSpacing: '8px', fontSize: '20px' },
              value: pin,
              onChange: (e) => setPin(e.target.value.replace(/\D/g, ''))
            })
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Confirm 4-Digit PIN'),
            h('input', {
              type: 'password',
              maxLength: 4,
              pattern: '\\d{4}',
              required: true,
              placeholder: '••••',
              className: 'form-input',
              style: { textAlign: 'center', letterSpacing: '8px', fontSize: '20px' },
              value: confirmPin,
              onChange: (e) => setConfirmPin(e.target.value.replace(/\D/g, ''))
            })
          ),

          h('div', { className: 'sheet-actions' },
            h('button', { type: 'button', className: 'cancel-btn', onClick: onClose }, 'Cancel'),
            h('button', { type: 'submit', className: 'submit-btn' }, 'Enable PIN Lock')
          )
        )
      )
    );
  }

  // Create / Edit Recurring Transaction Modal Dialog (Requirement #3)
  function CreateRecurringModalDialog({ categories, accounts, currency, initialData, onClose, onSave, onDelete }) {
    const isEditing = Boolean(initialData);
    const [name, setName] = useState(initialData?.name || '');
    const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
    const [type, setType] = useState(initialData?.type || 'EXPENSE');
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || (categories[0]?.id || 'cat-bills'));
    const [paymentAccount, setPaymentAccount] = useState(initialData?.paymentAccount || (accounts[0]?.name || 'Bank'));
    const [frequency, setFrequency] = useState(initialData?.frequency || 'MONTHLY');
    const [dueDay, setDueDay] = useState(initialData?.dueDay ? String(initialData.dueDay) : '5');
    const [autoAdd, setAutoAdd] = useState(initialData?.autoAdd !== undefined ? initialData.autoAdd : true);

    const handleSubmit = (e) => {
      e.preventDefault();
      const numAmt = safeRound(parseFloat(amount));
      if (!name.trim()) return alert('Please enter obligation name.');
      if (isNaN(numAmt) || numAmt <= 0) return alert('Please enter valid amount.');

      onSave({
        name: name.trim(),
        amount: numAmt,
        type,
        categoryId,
        paymentAccount,
        frequency,
        dueDay: parseInt(dueDay, 10) || 5,
        autoAdd
      });
    };

    const handleDelete = () => {
      if (confirm(`Are you sure you want to delete "${initialData.name}"?`)) {
        onDelete(initialData.id);
      }
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '440px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, isEditing ? '✏️' : '📅'),
            isEditing ? ' Edit Recurring Obligation' : ' Add Recurring Transaction'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('form', { onSubmit: handleSubmit },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Obligation Name *'),
            h('input', {
              type: 'text',
              required: true,
              placeholder: 'e.g. Bike EMI, Rent, Gym, Netflix, Internet',
              className: 'form-input',
              value: name,
              onChange: (e) => setName(e.target.value)
            })
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, `Amount (${currency}) *`),
              h('input', {
                type: 'number',
                required: true,
                min: '1',
                step: 'any',
                className: 'form-input',
                value: amount,
                onChange: (e) => setAmount(e.target.value)
              })
            ),
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Type'),
              h('select', {
                className: 'form-select',
                value: type,
                onChange: (e) => setType(e.target.value)
              },
                h('option', { value: 'EXPENSE' }, 'Expense'),
                h('option', { value: 'INCOME' }, 'Income'),
                h('option', { value: 'FUND_CONTRIBUTION' }, 'Savings Contribution')
              )
            )
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Category'),
              h('select', {
                className: 'form-select',
                value: categoryId,
                onChange: (e) => setCategoryId(e.target.value)
              },
                categories.map((c) => h('option', { key: c.id, value: c.id }, `${c.icon} ${c.name}`))
              )
            ),
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Payment Account'),
              h('select', {
                className: 'form-select',
                value: paymentAccount,
                onChange: (e) => setPaymentAccount(e.target.value)
              },
                accounts.map((a) => h('option', { key: a.id, value: a.name }, a.name))
              )
            )
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Frequency'),
              h('select', {
                className: 'form-select',
                value: frequency,
                onChange: (e) => setFrequency(e.target.value)
              },
                h('option', { value: 'MONTHLY' }, 'Monthly'),
                h('option', { value: 'WEEKLY' }, 'Weekly'),
                h('option', { value: 'QUARTERLY' }, 'Quarterly'),
                h('option', { value: 'YEARLY' }, 'Yearly')
              )
            ),
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Due Day of Month (1-31)'),
              h('input', {
                type: 'number',
                min: '1',
                max: '31',
                required: true,
                className: 'form-input',
                value: dueDay,
                onChange: (e) => setDueDay(e.target.value)
              })
            )
          ),

          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' } },
            h('input', {
              type: 'checkbox',
              id: 'recAutoAdd',
              checked: autoAdd,
              onChange: (e) => setAutoAdd(e.target.checked)
            }),
            h('label', { htmlFor: 'recAutoAdd', style: { color: '#fff', fontSize: '13px', cursor: 'pointer' } },
              '⚡ Auto-create transaction when due'
            )
          ),

          h('div', { className: 'sheet-actions', style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
            isEditing &&
              h('button', {
                type: 'button',
                className: 'cancel-btn',
                style: { background: 'rgba(239, 68, 68, 0.15)', color: 'var(--overspent-red)', border: '1px solid rgba(239, 68, 68, 0.3)', marginRight: 'auto' },
                onClick: handleDelete
              }, '🗑️ Delete'),
            h('button', { type: 'button', className: 'cancel-btn', onClick: onClose }, 'Cancel'),
            h('button', { type: 'submit', className: 'submit-btn' }, isEditing ? '💾 Save Changes' : '➕ Save Obligation')
          )
        )
      )
    );
  }

  // Mount React App
  function mountApp() {
    const rootEl = document.getElementById('root');
    if (!rootEl) return;
    const root = ReactDOM.createRoot(rootEl);
    root.render(h(ExpenseTrackerApp));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }
})();
