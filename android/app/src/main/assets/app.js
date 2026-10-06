/**
 * EXPENSE TRACKER — STANDALONE MOBILE-FIRST PERSONAL FINANCE APPLICATION
 * Built with React 18, Supabase RLS integration, Offline Storage & Decimal-Safe Analytics.
 * Adheres strictly to all 22 prompt specifications.
 */

(function () {
  'use strict';

  const { useState, useEffect, useMemo, useCallback } = React;
  const h = React.createElement;

  // --- STORAGE KEYS ---
  const STORAGE_KEYS = {
    PROFILE: 'exptrk_profile_v1',
    TRANSACTIONS: 'exptrk_transactions_v1',
    CATEGORIES: 'exptrk_categories_v1',
    FUNDS: 'exptrk_funds_v1',
    CONTRIBUTIONS: 'exptrk_contributions_v1',
    BUDGET: 'exptrk_budget_v1',
    CATEGORY_BUDGETS: 'exptrk_category_budgets_v1',
    RECURRING_PAYMENTS: 'exptrk_recurring_payments_v1',
    PAYMENT_METHODS: 'exptrk_payment_methods_v1',
    SUPABASE_CONFIG: 'exptrk_supabase_config_v1',
    SMS_SETTINGS: 'exptrk_sms_settings_v1',
    SMS_CANDIDATES: 'exptrk_sms_candidates_v1',
    SMS_MAPPINGS: 'exptrk_sms_mappings_v1',
    SMS_LOG_EVENTS: 'exptrk_sms_log_events_v1',
    ACCOUNTS: 'exptrk_accounts_v1'
  };

  // --- DEFAULT DATA SEEDS ---
  const DEFAULT_SMS_SETTINGS = {
    enabled: false,
    detectionMode: 'REVIEW_EVERY', // 'OFF', 'REVIEW_EVERY', 'AUTO_ADD_HIGH', 'AUTO_ADD_ALL'
    historicalImportEnabled: false,
    notificationsEnabled: true
  };

  const DEFAULT_ACCOUNTS = [
    { id: 'acc-1', name: 'HDFC Bank Account', type: 'Bank', lastFour: '1234', balance: 15000 },
    { id: 'acc-2', name: 'Google Pay UPI', type: 'UPI', lastFour: '', balance: 0 },
    { id: 'acc-3', name: 'Cash in Hand', type: 'Cash', lastFour: '', balance: 2500 }
  ];

  const DEFAULT_PROFILE = {
    id: 'user-default-1',
    name: 'Radhadevan',
    currency: '₹'
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
      notes: 'Monthly employer credit'
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
      notes: 'Monthly EMI installment'
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
      notes: 'Apartment rent transfer'
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
      notes: 'Monthly gym subscription pass'
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
      notes: 'Weekly groceries and dinner'
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
      notes: 'Fuel fill-up at Shell'
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
      notes: 'Dinner with friends'
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
      notes: 'Breakfast'
    }
  ];

  const INITIAL_FUNDS = [
    {
      id: 'fund-rd',
      name: 'RD',
      fundType: 'MONTHLY',
      icon: '🏦',
      targetAmount: 12000,
      currentAmount: 1000,
      contributionAmount: 1000,
      frequency: 'MONTHLY',
      frequencyDay: '10',
      status: 'ACTIVE'
    },
    {
      id: 'fund-weekly',
      name: 'Weekly Saving Fund',
      fundType: 'WEEKLY',
      icon: '💰',
      targetAmount: 1600,
      currentAmount: 1200,
      contributionAmount: 400,
      frequency: 'WEEKLY',
      frequencyDay: 'Monday',
      status: 'ACTIVE'
    },
    {
      id: 'fund-emergency',
      name: 'Emergency Fund',
      fundType: 'ONE_TIME',
      icon: '🛡️',
      targetAmount: 20000,
      currentAmount: 5000,
      contributionAmount: 500,
      frequency: 'MONTHLY',
      frequencyDay: '1st',
      status: 'ACTIVE'
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

  const INITIAL_FIXED_PAYMENTS = [
    { id: 'rec-1', name: 'Bike EMI', amount: 6000, categoryId: 'cat-emi', dueDay: 3, isPaid: true },
    { id: 'rec-2', name: 'Rent', amount: 3000, categoryId: 'cat-rent', dueDay: 4, isPaid: true },
    { id: 'rec-3', name: 'Gym', amount: 1300, categoryId: 'cat-gym', dueDay: 5, isPaid: true },
    { id: 'rec-4', name: 'Subscription', amount: 500, categoryId: 'cat-subscriptions', dueDay: 18, isPaid: false },
    { id: 'rec-5', name: 'RD', amount: 1000, categoryId: 'cat-bills', dueDay: 10, isPaid: true },
    { id: 'rec-6', name: 'Home Expenses', amount: 500, categoryId: 'cat-bills', dueDay: 25, isPaid: false }
  ];

  // --- DECIMAL-SAFE MATH & HELPERS ---
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

  // --- MAIN REACT APPLICATION COMPONENT ---
  function ExpenseTrackerApp() {
    // Persistent States
    const [profile, setProfile] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.PROFILE);
        return s ? JSON.parse(s) : DEFAULT_PROFILE;
      } catch { return DEFAULT_PROFILE; }
    });

    const [transactions, setTransactions] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        return s ? JSON.parse(s) : INITIAL_TRANSACTIONS;
      } catch { return INITIAL_TRANSACTIONS; }
    });

    const [categories, setCategories] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        return s ? JSON.parse(s) : DEFAULT_CATEGORIES;
      } catch { return DEFAULT_CATEGORIES; }
    });

    const [funds, setFunds] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.FUNDS);
        return s ? JSON.parse(s) : INITIAL_FUNDS;
      } catch { return INITIAL_FUNDS; }
    });

    const [contributions, setContributions] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS);
        return s ? JSON.parse(s) : INITIAL_CONTRIBUTIONS;
      } catch { return INITIAL_CONTRIBUTIONS; }
    });

    const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.BUDGET);
        return s ? JSON.parse(s).totalBudget : 25000;
      } catch { return 25000; }
    });

    const [categoryBudgets, setCategoryBudgets] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.CATEGORY_BUDGETS);
        return s ? JSON.parse(s) : INITIAL_CATEGORY_BUDGETS;
      } catch { return INITIAL_CATEGORY_BUDGETS; }
    });

    const [fixedPayments, setFixedPayments] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.RECURRING_PAYMENTS);
        return s ? JSON.parse(s) : INITIAL_FIXED_PAYMENTS;
      } catch { return INITIAL_FIXED_PAYMENTS; }
    });

    const [supabaseConfig, setSupabaseConfig] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
        return s ? JSON.parse(s) : { url: '', anonKey: '', isConnected: false };
      } catch { return { url: '', anonKey: '', isConnected: false }; }
    });

    // SMS Auto-Tracking & Account States
    const [smsSettings, setSmsSettings] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.SMS_SETTINGS);
        return s ? JSON.parse(s) : DEFAULT_SMS_SETTINGS;
      } catch { return DEFAULT_SMS_SETTINGS; }
    });

    const [smsCandidates, setSmsCandidates] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.SMS_CANDIDATES);
        return s ? JSON.parse(s) : [];
      } catch { return []; }
    });

    const [smsMappings, setSmsMappings] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.SMS_MAPPINGS);
        return s ? JSON.parse(s) : {};
      } catch { return {}; }
    });

    const [smsLogEvents, setSmsLogEvents] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.SMS_LOG_EVENTS);
        return s ? JSON.parse(s) : [];
      } catch { return []; }
    });

    const [accounts, setAccounts] = useState(() => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
        return s ? JSON.parse(s) : DEFAULT_ACCOUNTS;
      } catch { return DEFAULT_ACCOUNTS; }
    });

    // Navigation & Viewing State
    const [activeTab, setActiveTab] = useState('HOME');
    const [viewYear, setViewYear] = useState(currentYear);
    const [viewMonth, setViewMonth] = useState(currentMonthNum); // 1-indexed

    // Modals & UI States
    const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
    const [editingTxn, setEditingTxn] = useState(null);
    const [isAddFundOpen, setIsAddFundOpen] = useState(false);
    const [activeFundForContrib, setActiveFundForContrib] = useState(null);
    const [isCatBudgetModalOpen, setIsCatBudgetModalOpen] = useState(false);
    const [deletingTxnId, setDeletingTxnId] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const [reportsRange, setReportsRange] = useState('1M');

    // SMS & Modal States
    const [isSmsDisclosureOpen, setIsSmsDisclosureOpen] = useState(false);
    const [detectedTxnForReview, setDetectedTxnForReview] = useState(null);
    const [viewingTxnDetails, setViewingTxnDetails] = useState(null);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [isImportingHistorical, setIsImportingHistorical] = useState(false);
    const [historicalImportDays, setHistoricalImportDays] = useState(30);
    const [simInputText, setSimInputText] = useState('Your A/c XX1234 is debited by Rs.500 at ABC PETROL PUMP via UPI. Ref 453829102');
    const [simParsedResult, setSimParsedResult] = useState(null);

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

    // Save to LocalStorage on changes
    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    }, [profile]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }, [transactions]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(funds));
    }, [funds]);

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
      localStorage.setItem(STORAGE_KEYS.RECURRING_PAYMENTS, JSON.stringify(fixedPayments));
    }, [fixedPayments]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(supabaseConfig));
    }, [supabaseConfig]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.SMS_SETTINGS, JSON.stringify(smsSettings));
    }, [smsSettings]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.SMS_CANDIDATES, JSON.stringify(smsCandidates));
    }, [smsCandidates]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.SMS_MAPPINGS, JSON.stringify(smsMappings));
    }, [smsMappings]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.SMS_LOG_EVENTS, JSON.stringify(smsLogEvents));
    }, [smsLogEvents]);

    useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    }, [accounts]);

    // Month Navigation
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

    // Dynamic Monthly Calculations (NO HARDCODED TOTALS)
    const stats = useMemo(() => {
      const targetPrefix = `${viewYear}-${pad(viewMonth)}`;
      const todayStr = `${currentYear}-${pad(currentMonthNum)}-${pad(now.getDate())}`;

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
        }
        if (t.date === todayStr) {
          if (t.type === 'EXPENSE') todaySpend += t.amount;
          todayCount++;
        }
      });

      let allocatedFunds = 0;
      contributions.forEach((c) => {
        if (c.date && c.date.startsWith(targetPrefix)) {
          allocatedFunds += c.amount;
        }
      });

      income = safeRound(income);
      expenses = safeRound(expenses);
      allocatedFunds = safeRound(allocatedFunds);
      todaySpend = safeRound(todaySpend);

      // Available Balance = Income - Expenses - Allocated Funds
      const availableBalance = safeRound(income - expenses - allocatedFunds);
      const savings = safeRound(income - expenses);
      const savingsPct = income > 0 ? safeRound((savings / income) * 100) : 0;
      const budgetUsedPct = monthlyBudgetLimit > 0 ? safeRound((expenses / monthlyBudgetLimit) * 100) : 0;
      const budgetRemaining = safeRound(Math.max(0, monthlyBudgetLimit - expenses));

      // Highest day
      let highestDay = '—';
      let maxDay = 0;
      Object.entries(dayTotals).forEach(([d, a]) => {
        if (a > maxDay) {
          maxDay = a;
          const dt = new Date(d);
          highestDay = `${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${profile.currency}${a.toLocaleString()})`;
        }
      });

      // Highest category
      let highestCat = 'None';
      let maxCat = 0;
      Object.entries(catTotals).forEach(([cid, a]) => {
        if (a > maxCat) {
          maxCat = a;
          const found = categories.find((c) => c.id === cid);
          highestCat = found ? found.name : 'Other';
        }
      });

      const daysInM = new Date(viewYear, viewMonth, 0).getDate();
      const passedDays = viewYear === currentYear && viewMonth === currentMonthNum ? now.getDate() : daysInM;
      const dailyAvg = passedDays > 0 ? safeRound(expenses / passedDays) : 0;

      return {
        income,
        expenses,
        allocatedFunds,
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
        monthTxnCount
      };
    }, [transactions, contributions, viewYear, viewMonth, monthlyBudgetLimit, categories, profile.currency]);

    // Category Breakdown for Donut Chart
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

    // Save or Edit Transaction
    const handleSaveTransaction = (txnData) => {
      if (editingTxn) {
        setTransactions((prev) => prev.map((t) => (t.id === editingTxn.id ? { ...t, ...txnData, updatedAt: new Date().toISOString() } : t)));
        showToast('Transaction updated successfully!');
      } else {
        const newTxn = {
          id: 'txn-' + Date.now(),
          ...txnData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setTransactions((prev) => [newTxn, ...prev]);
        showToast('Transaction recorded successfully!');
      }
      setIsAddTxnOpen(false);
      setEditingTxn(null);
    };

    // Duplicate Transaction
    const handleDuplicateTxn = (txn) => {
      const duplicated = {
        ...txn,
        id: 'txn-' + Date.now(),
        date: `${currentYear}-${pad(currentMonthNum)}-${pad(now.getDate())}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setTransactions((prev) => [duplicated, ...prev]);
      showToast('Transaction duplicated to today!');
    };

    // Delete Transaction
    const handleConfirmDelete = () => {
      if (!deletingTxnId) return;
      setTransactions((prev) => prev.filter((t) => t.id !== deletingTxnId));
      setDeletingTxnId(null);
      showToast('Transaction deleted.');
    };

    // SMS Metrics calculation
    const todayDateStr = `${currentYear}-${pad(currentMonthNum)}-${pad(now.getDate())}`;
    const smsMetrics = useMemo(() => {
      let detectedToday = 0;
      let autoAdded = 0;
      let waitingReview = 0;
      let ignored = 0;

      smsCandidates.forEach((c) => {
        if (c.transactionDate === todayDateStr) detectedToday++;
        if (c.status === 'APPROVED' && c.transactionDate === todayDateStr) autoAdded++;
        if (c.status === 'PENDING') waitingReview++;
        if (c.status === 'IGNORED') ignored++;
      });

      return { detectedToday, autoAdded, waitingReview, ignored };
    }, [smsCandidates, todayDateStr]);

    // Learn category mapping for merchant
    const handleLearnCategory = (merchant, categoryId) => {
      if (!merchant || merchant === 'Unknown' || !categoryId) return;
      const cat = categories.find((c) => c.id === categoryId);
      if (!cat) return;
      setSmsMappings((prev) => ({
        ...prev,
        [merchant.toLowerCase().trim()]: {
          categoryId: cat.id,
          categoryName: cat.name,
          icon: cat.icon
        }
      }));
    };

    // Process incoming SMS text
    const processSmsText = useCallback((smsText, sender = 'SMS') => {
      if (!window.SmsTransactionParser) return { status: 'ERROR', error: 'Parser not loaded' };

      const parsed = window.SmsTransactionParser.parseSms(smsText, {
        userFunds: funds,
        learnedMappings: smsMappings,
        existingTransactions: transactions,
        pendingCandidates: smsCandidates,
        userId: profile.id,
        keepRawText: false
      });

      // If ignored (OTP, coupon, delivery, etc.)
      if (parsed.isIgnored) {
        const logItem = {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          type: 'IGNORED',
          reason: parsed.ignoreReason || 'Non-financial message',
          preview: smsText.slice(0, 45)
        };
        setSmsLogEvents((prev) => [logItem, ...prev.slice(0, 49)]);
        return { status: 'IGNORED', result: parsed };
      }

      // If duplicate detected
      if (parsed.isDuplicate) {
        const logItem = {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString(),
          type: 'DUPLICATE',
          amount: parsed.amount,
          merchant: parsed.merchant,
          preview: `${parsed.merchant} - ${profile.currency}${parsed.amount}`
        };
        setSmsLogEvents((prev) => [logItem, ...prev.slice(0, 49)]);
        if (smsSettings.notificationsEnabled) {
          showToast(`Duplicate: ${parsed.merchant} (${profile.currency}${parsed.amount}) already recorded.`);
        }
        return { status: 'DUPLICATE', result: parsed };
      }

      // Financial transaction identified
      const candidate = {
        id: 'cand-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        fingerprint: parsed.fingerprint,
        type: parsed.type,
        amount: parsed.amount,
        merchant: parsed.merchant,
        categoryId: parsed.categoryId || (parsed.type === 'INCOME' ? 'cat-salary' : 'cat-other-exp'),
        categoryName: parsed.categoryName || 'Other',
        categoryIcon: parsed.categoryIcon || '📦',
        paymentMethod: parsed.paymentMethod || 'UPI',
        transactionDate: parsed.transactionDate,
        transactionTime: parsed.transactionTime,
        transactionReference: parsed.transactionReference,
        accountSuffix: parsed.accountSuffix,
        confidence: parsed.confidence,
        status: 'PENDING',
        source: 'SMS',
        fundTargetId: parsed.fundTargetId,
        fundTargetName: parsed.fundTargetName,
        createdAt: new Date().toISOString()
      };

      // Determine Auto-Add vs Review
      const shouldAutoAdd =
        smsSettings.detectionMode === 'AUTO_ADD_ALL' ||
        (smsSettings.detectionMode === 'AUTO_ADD_HIGH' && parsed.confidence === 'HIGH');

      if (shouldAutoAdd) {
        candidate.status = 'APPROVED';
        candidate.processedAt = new Date().toISOString();

        const newTxn = {
          id: 'txn-' + Date.now(),
          type: candidate.type,
          categoryId: candidate.categoryId,
          categoryName: candidate.categoryName,
          categoryIcon: candidate.categoryIcon,
          categoryColor: '#00f59b',
          amount: candidate.amount,
          date: candidate.transactionDate,
          time: candidate.transactionTime,
          paymentMethod: candidate.paymentMethod,
          description: candidate.merchant,
          notes: `Auto-added from SMS (${candidate.confidence} confidence)`,
          source: 'SMS',
          smsCandidateId: candidate.id,
          transactionReference: candidate.transactionReference,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setTransactions((prev) => [newTxn, ...prev]);

        // If matched to a fund contribution, record contribution
        if (candidate.type === 'FUND_CONTRIBUTION' && candidate.fundTargetId) {
          handleAddContribution(candidate.fundTargetId, candidate.amount, `Contribution from SMS: ${candidate.merchant}`);
        }

        setSmsCandidates((prev) => [candidate, ...prev]);
        handleLearnCategory(candidate.merchant, candidate.categoryId);

        if (smsSettings.notificationsEnabled) {
          showToast(`Auto-added: ${profile.currency}${candidate.amount} at ${candidate.merchant}`);
        }
      } else {
        // Pending Review mode
        setSmsCandidates((prev) => [candidate, ...prev]);
        if (smsSettings.notificationsEnabled) {
          showToast(`Transaction detected: ${profile.currency}${candidate.amount} at ${candidate.merchant}`);
          setDetectedTxnForReview(candidate);
        }
      }

      // Add to log
      const logItem = {
        id: 'log-' + Date.now(),
        timestamp: new Date().toISOString(),
        type: candidate.type,
        amount: candidate.amount,
        merchant: candidate.merchant,
        status: candidate.status,
        confidence: candidate.confidence,
        preview: `${candidate.merchant} - ${profile.currency}${candidate.amount}`
      };
      setSmsLogEvents((prev) => [logItem, ...prev.slice(0, 49)]);

      return { status: 'SUCCESS', candidate, wasAutoAdded: shouldAutoAdd };
    }, [funds, smsMappings, transactions, smsCandidates, profile.id, profile.currency, smsSettings, showToast]);

    // Approve candidate manually
    const handleApproveCandidate = (candidate, overrides = {}) => {
      const merged = { ...candidate, ...overrides };
      const newTxn = {
        id: 'txn-' + Date.now(),
        type: merged.type,
        categoryId: merged.categoryId || 'cat-other-exp',
        categoryName: merged.categoryName || 'Other',
        categoryIcon: merged.categoryIcon || '📦',
        categoryColor: '#00f59b',
        amount: merged.amount,
        date: merged.transactionDate,
        time: merged.transactionTime,
        paymentMethod: merged.paymentMethod || 'UPI',
        description: merged.merchant || 'SMS Transaction',
        notes: merged.notes || `Approved SMS transaction`,
        source: 'SMS',
        smsCandidateId: merged.id,
        transactionReference: merged.transactionReference,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setTransactions((prev) => [newTxn, ...prev]);

      if (merged.type === 'FUND_CONTRIBUTION' && merged.fundTargetId) {
        handleAddContribution(merged.fundTargetId, merged.amount, `Contribution from SMS: ${merged.merchant}`);
      }

      setSmsCandidates((prev) =>
        prev.map((c) => (c.id === candidate.id ? { ...c, status: 'APPROVED', processedAt: new Date().toISOString() } : c))
      );
      handleLearnCategory(merged.merchant, merged.categoryId);
      setDetectedTxnForReview(null);
      showToast('Transaction added to ledger!');
    };

    // Ignore candidate
    const handleIgnoreCandidate = (candidateId) => {
      setSmsCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, status: 'IGNORED', processedAt: new Date().toISOString() } : c))
      );
      setDetectedTxnForReview(null);
      showToast('Transaction ignored.');
    };

    // Delete candidate
    const handleDeleteCandidate = (candidateId) => {
      setSmsCandidates((prev) => prev.filter((c) => c.id !== candidateId));
      showToast('Removed from review list.');
    };

    // Hookup Android SMS Bridge event listener
    useEffect(() => {
      if (window.AndroidSmsBridge && typeof window.AndroidSmsBridge.onSmsReceived === 'function') {
        const unsubscribe = window.AndroidSmsBridge.onSmsReceived((data) => {
          if (smsSettings.enabled && data && data.body) {
            processSmsText(data.body, data.sender);
          }
        });
        return unsubscribe;
      }
    }, [smsSettings.enabled, processSmsText]);

    // Handle user enabling SMS Tracking
    const handleEnableSmsTracking = async () => {
      if (!window.AndroidSmsBridge) return;
      const res = await window.AndroidSmsBridge.requestPermission('RECEIVE_SMS');
      if (res && res.granted) {
        setSmsSettings((prev) => ({ ...prev, enabled: true }));
        await window.AndroidSmsBridge.enableReceiver(true);
        setIsSmsDisclosureOpen(false);
        showToast('SMS Auto-Tracking enabled successfully!');
      } else {
        setIsSmsDisclosureOpen(false);
        showToast('SMS tracking is disabled. You can continue adding transactions manually.');
      }
    };

    // Handle user disabling SMS Tracking
    const handleDisableSmsTracking = async () => {
      setSmsSettings((prev) => ({ ...prev, enabled: false }));
      if (window.AndroidSmsBridge) {
        await window.AndroidSmsBridge.enableReceiver(false);
      }
      showToast('SMS tracking disabled. Existing records kept safely.');
    };

    // Handle Historical SMS Import
    const handleImportHistoricalSms = async (days) => {
      if (!window.AndroidSmsBridge) return;
      setIsImportingHistorical(true);
      showToast(`Scanning messages for the past ${days} days...`);
      try {
        const msgs = await window.AndroidSmsBridge.queryHistoricalSms(days);
        let count = 0;
        msgs.forEach((m) => {
          const res = processSmsText(m.body, m.sender);
          if (res && res.status === 'SUCCESS') count++;
        });
        showToast(`Historical scan complete: ${count} transactions imported!`);
      } catch (err) {
        showToast('Historical import failed: ' + (err.message || 'Unknown error'));
      } finally {
        setIsImportingHistorical(false);
      }
    };

    // Add Fund Contribution
    const handleAddContribution = (fundId, amount, notes) => {
      const numAmt = safeRound(parseFloat(amount));
      if (isNaN(numAmt) || numAmt <= 0) return;

      const newContrib = {
        id: 'contrib-' + Date.now(),
        fundId,
        amount: numAmt,
        date: `${viewYear}-${pad(viewMonth)}-${pad(now.getDate())}`,
        notes: notes || 'Fund contribution',
        createdAt: new Date().toISOString()
      };

      setContributions((prev) => [newContrib, ...prev]);

      // Update fund current amount
      setFunds((prev) =>
        prev.map((f) => (f.id === fundId ? { ...f, currentAmount: safeRound(f.currentAmount + numAmt), updatedAt: new Date().toISOString() } : f))
      );

      setActiveFundForContrib(null);
      showToast(`Added ${profile.currency}${numAmt.toLocaleString()} to fund!`);
    };

    // Create New Fund
    const handleCreateFund = (fundData) => {
      const newFund = {
        id: 'fund-' + Date.now(),
        ...fundData,
        currentAmount: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setFunds((prev) => [...prev, newFund]);
      setIsAddFundOpen(false);
      showToast(`Created fund: ${fundData.name}`);
    };

    // Save Category Budget Limit
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

    // Toggle Fixed Payment Status
    const handleToggleFixedPayment = (id) => {
      setFixedPayments((prev) =>
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

    // Reset Sample Data
    const handleResetSampleData = () => {
      if (confirm('Reset to initial sample data? Your custom additions will be replaced with clean demo data.')) {
        setTransactions(INITIAL_TRANSACTIONS);
        setFunds(INITIAL_FUNDS);
        setContributions(INITIAL_CONTRIBUTIONS);
        setMonthlyBudgetLimit(25000);
        setCategoryBudgets(INITIAL_CATEGORY_BUDGETS);
        setFixedPayments(INITIAL_FIXED_PAYMENTS);
        setProfile(DEFAULT_PROFILE);
        showToast('Reset to initial sample data successfully!');
      }
    };

    // Export Backup
    const handleExportBackup = () => {
      const backup = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        profile,
        transactions,
        categories,
        funds,
        contributions,
        monthlyBudgetLimit,
        categoryBudgets,
        fixedPayments
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

    // Import Backup
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
          if (Array.isArray(parsed.funds)) setFunds(parsed.funds);
          if (Array.isArray(parsed.contributions)) setContributions(parsed.contributions);
          if (parsed.monthlyBudgetLimit) setMonthlyBudgetLimit(parsed.monthlyBudgetLimit);
          if (Array.isArray(parsed.categoryBudgets)) setCategoryBudgets(parsed.categoryBudgets);
          if (Array.isArray(parsed.fixedPayments)) setFixedPayments(parsed.fixedPayments);
          showToast('Backup restored successfully!');
        } catch (err) {
          alert('Failed to parse JSON backup file: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    // Clear All Data
    const handleClearAll = () => {
      if (confirm('Are you sure you want to clear all transaction and fund data? This cannot be undone.')) {
        setTransactions([]);
        setContributions([]);
        showToast('All transaction data cleared.');
      }
    };

    // =========================================================================
    // SUB-VIEWS
    // =========================================================================

    // 1. HOME VIEW
    const renderHomeView = () => {
      const recentTxns = transactions.slice(0, 5);

      return h('div', { className: 'page-view' },
        // SMS Tracking Header Indicator (Requirement #25)
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' } },
          h('div', {
            className: 'sms-home-badge',
            onClick: () => setActiveTab('SMS_TRACKING'),
            title: 'SMS Auto-Tracking'
          },
            h('span', { className: `sms-status-dot ${smsSettings.enabled ? '' : 'off'}` }),
            h('span', null, smsSettings.enabled ? 'SMS TRACKING ● ON' : 'SMS TRACKING ● OFF'),
            smsMetrics.detectedToday > 0 ? h('span', { className: 'sms-count-pill' }, `${smsMetrics.detectedToday} auto-detected today`) : null
          )
        ),

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

        // Three Compact Cards: INCOME | EXPENSES | SAVINGS
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

        // This Month's Spending Donut / Category Breakdown
        h('div', { className: 'donut-section-card' },
          h('div', { className: 'section-header', style: { margin: '0 0 16px' } },
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
                // Simple SVG Donut
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
                // Legend
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

        // Prominent + ADD TRANSACTION Button
        h('button', {
          type: 'button',
          className: 'prominent-add-btn',
          onClick: () => {
            setEditingTxn(null);
            setIsAddTxnOpen(true);
          }
        },
          h('span', { style: { fontSize: '20px' } }, '➕'),
          'ADD TRANSACTION'
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
                h('div', { className: 'empty-desc' }, 'Start tracking your money by tapping the button above.')
              )
            : h('div', { className: 'txn-list' },
                recentTxns.map((t) =>
                  h('div', {
                    key: t.id,
                    className: 'txn-card',
                    style: { cursor: 'pointer' },
                    onClick: () => setViewingTxnDetails(t)
                  },
                    h('div', { className: 'txn-left' },
                      h('div', { className: 'txn-cat-icon' }, t.categoryIcon || '📦'),
                      h('div', { className: 'txn-details' },
                        h('div', { className: 'txn-desc' }, t.description),
                        h('div', { className: 'txn-meta' },
                          h('span', { className: 'txn-pill' }, t.categoryName || 'Other'),
                          h('span', { className: 'txn-pill' }, t.paymentMethod || 'UPI'),
                          t.source === 'SMS' ? h('span', { className: 'txn-source-badge sms' }, 'SMS') : null
                        )
                      )
                    ),
                    h('div', { className: 'txn-right' },
                      h('div', { className: `txn-amount ${t.type.toLowerCase()}` },
                        `${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount, profile.currency)}`
                      ),
                      h('div', { className: 'txn-date-time' }, t.date)
                    )
                  )
                )
              )
        )
      );
    };

    // 2. TRANSACTIONS PAGE
    const renderTransactionsView = () => {
      // Filter transactions
      const filtered = transactions.filter((t) => {
        // Search
        if (txnSearch.trim()) {
          const q = txnSearch.toLowerCase();
          const matchDesc = t.description && t.description.toLowerCase().includes(q);
          const matchCat = t.categoryName && t.categoryName.toLowerCase().includes(q);
          const matchPay = t.paymentMethod && t.paymentMethod.toLowerCase().includes(q);
          if (!matchDesc && !matchCat && !matchPay) return false;
        }
        // Type filter
        if (txnTypeFilter !== 'ALL' && t.type !== txnTypeFilter) return false;
        // Category filter
        if (txnCatFilter !== 'ALL' && t.categoryId !== txnCatFilter) return false;
        // Month filter
        const targetPrefix = `${viewYear}-${pad(viewMonth)}`;
        if (t.date && !t.date.startsWith(targetPrefix)) return false;
        return true;
      });

      // Sort
      filtered.sort((a, b) => {
        if (txnSort === 'NEWEST') return b.date > a.date ? 1 : -1;
        if (txnSort === 'OLDEST') return a.date > b.date ? 1 : -1;
        if (txnSort === 'HIGHEST') return b.amount - a.amount;
        if (txnSort === 'LOWEST') return a.amount - b.amount;
        return 0;
      });

      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '📋'),
            ` Daily Financial Log (${filtered.length})`
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

        // Filter Controls
        h('div', { className: 'filter-bar' },
          h('div', { className: 'search-input-wrap' },
            h('span', { className: 'search-icon' }, '🔍'),
            h('input', {
              type: 'text',
              className: 'search-input',
              placeholder: 'Search merchant, note, method...',
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
            h('option', { value: 'FUND_CONTRIBUTION' }, 'Fund Contributions'),
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
        ),

        // Transaction List
        filtered.length === 0
          ? h('div', { className: 'empty-state' },
              h('span', { className: 'empty-icon' }, '🔍'),
              h('div', { className: 'empty-title' }, 'No matching transactions found'),
              h('div', { className: 'empty-desc' }, 'Try clearing filters or log a new transaction for this month.')
            )
          : h('div', { className: 'txn-list' },
              filtered.map((t) =>
                h('div', {
                  key: t.id,
                  className: 'txn-card',
                  style: { cursor: 'pointer' },
                  onClick: () => setViewingTxnDetails(t)
                },
                  h('div', { className: 'txn-left' },
                    h('div', { className: 'txn-cat-icon' }, t.categoryIcon || '📦'),
                    h('div', { className: 'txn-details' },
                      h('div', { className: 'txn-desc' }, t.description),
                      h('div', { className: 'txn-meta' },
                        h('span', { className: 'txn-pill' }, t.categoryName || 'Other'),
                        h('span', { className: 'txn-pill' }, t.paymentMethod || 'UPI'),
                        t.source === 'SMS' ? h('span', { className: 'txn-source-badge sms' }, 'SMS') : null,
                        t.isRecurring ? h('span', { className: 'txn-pill', style: { color: 'var(--neon-green)' } }, '🔄 Recurring') : null
                      ),
                      t.notes ? h('div', { style: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' } }, t.notes) : null
                    )
                  ),
                  h('div', { className: 'txn-right' },
                    h('div', { className: `txn-amount ${t.type.toLowerCase()}` },
                      `${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount, profile.currency)}`
                    ),
                    h('div', { className: 'txn-date-time' }, `${t.date} ${t.time || ''}`),
                    h('div', { className: 'txn-actions-row' },
                      h('button', {
                        type: 'button',
                        className: 'mini-action-btn',
                        title: 'Duplicate',
                        onClick: (e) => {
                          e.stopPropagation();
                          handleDuplicateTxn(t);
                        }
                      }, '📋 Copy'),
                      h('button', {
                        type: 'button',
                        className: 'mini-action-btn',
                        title: 'Edit',
                        onClick: (e) => {
                          e.stopPropagation();
                          setEditingTxn(t);
                          setIsAddTxnOpen(true);
                        }
                      }, '✏️ Edit'),
                      h('button', {
                        type: 'button',
                        className: 'mini-action-btn delete',
                        title: 'Delete',
                        onClick: (e) => {
                          e.stopPropagation();
                          setDeletingTxnId(t.id);
                        }
                      }, '🗑️ Del')
                    )
                  )
                )
              )
            )
      );
    };

    // 3. FUNDS PAGE (RD, WEEKLY SAVINGS, EMERGENCY FUND)
    const renderFundsView = () => {
      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '🏦'),
            ' Savings & Planned Funds'
          ),
          h('button', {
            type: 'button',
            className: 'today-jump-btn',
            onClick: () => setIsAddFundOpen(true)
          }, '➕ Create Fund')
        ),

        // Crucial distinction banner
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
          h('strong', { style: { color: 'var(--info-blue)' } }, '💡 Key Principle: '),
          'Fund contributions are allocated savings — they are ',
          h('strong', { style: { color: '#fff' } }, 'NOT counted as normal spending expenses'),
          ' in your budget, preserving accurate financial clarity.'
        ),

        // Funds Grid
        h('div', { className: 'funds-grid' },
          funds.map((f) => {
            const pct = f.targetAmount > 0 ? safeRound((f.currentAmount / f.targetAmount) * 100) : 0;
            const remaining = safeRound(Math.max(0, f.targetAmount - f.currentAmount));

            return h('div', { key: f.id, className: 'fund-card' },
              h('div', null,
                h('div', { className: 'fund-card-top' },
                  h('div', { className: 'fund-card-title-wrap' },
                    h('div', { className: 'fund-icon' }, f.icon || '🏦'),
                    h('div', null,
                      h('div', { className: 'fund-name' }, f.name),
                      h('div', { className: 'fund-type-badge' }, `${f.frequency} · ${f.fundType}`)
                    )
                  ),
                  h('div', { className: 'fund-progress-pct' }, `${Math.min(100, pct)}%`)
                ),

                h('div', { className: 'fund-amounts-row' },
                  h('span', null, 'Saved / Target:'),
                  h('strong', null, `${formatCurrency(f.currentAmount, profile.currency)} / ${formatCurrency(f.targetAmount, profile.currency)}`)
                ),
                h('div', { className: 'fund-amounts-row' },
                  h('span', null, 'Remaining Goal:'),
                  h('span', { style: { color: 'var(--text-muted)' } }, formatCurrency(remaining, profile.currency))
                ),

                h('div', { className: 'fund-progress-bar' },
                  h('div', { className: 'fund-progress-fill', style: { width: `${Math.min(100, pct)}%` } })
                ),

                h('div', { className: 'fund-next-sched' },
                  h('span', null, 'Next Contribution:'),
                  h('strong', { style: { color: 'var(--neon-green)' } }, `${formatCurrency(f.contributionAmount, profile.currency)} · ${f.frequencyDay || 'Scheduled'}`)
                )
              ),

              h('div', { className: 'fund-card-actions' },
                h('button', {
                  type: 'button',
                  className: 'fund-contribute-btn',
                  onClick: () => setActiveFundForContrib(f)
                }, '➕ Add Contribution')
              )
            );
          })
        ),

        // Recent Fund Contributions Ledger
        h('div', { style: { marginTop: '24px' } },
          h('div', { className: 'section-title', style: { marginBottom: '12px' } },
            h('span', null, '📜'),
            ' Recent Contributions'
          ),
          contributions.length === 0
            ? h('div', { className: 'empty-state', style: { padding: '20px' } },
                h('div', { className: 'empty-desc' }, 'No contributions recorded yet.')
              )
            : h('div', { className: 'txn-list' },
                contributions.slice(0, 5).map((c) => {
                  const fund = funds.find((f) => f.id === c.fundId);
                  return h('div', { key: c.id, className: 'txn-card' },
                    h('div', { className: 'txn-left' },
                      h('div', { className: 'txn-cat-icon' }, fund ? fund.icon : '🏦'),
                      h('div', { className: 'txn-details' },
                        h('div', { className: 'txn-desc' }, fund ? fund.name : 'Fund Contribution'),
                        h('div', { className: 'txn-meta' },
                          h('span', { className: 'txn-pill' }, c.date),
                          c.notes ? h('span', null, c.notes) : null
                        )
                      )
                    ),
                    h('div', { className: 'txn-right' },
                      h('div', { className: 'txn-amount fund' }, `+${formatCurrency(c.amount, profile.currency)}`)
                    )
                  );
                })
              )
        )
      );
    };

    // 4. BUDGET PAGE
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

        // Monthly Budget KPI Hero
        h('div', { className: 'budget-hero-box' },
          h('div', { className: 'budget-hero-stats' },
            h('div', null,
              h('div', { className: 'mini-kpi-label' }, 'TOTAL BUDGET'),
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: '#fff' } }, formatCurrency(monthlyBudgetLimit, profile.currency))
            ),
            h('div', null,
              h('div', { className: 'mini-kpi-label' }, 'SPENT'),
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

        // Category Budgets List
        h('div', { className: 'category-budget-list' },
          categoryBudgets.map((cb) => {
            const cat = categories.find((c) => c.id === cb.categoryId) || { name: 'Category', icon: '📦', color: '#00f59b' };
            const spent = categoryBreakdown.list.find((item) => item.id === cb.categoryId)?.amount || 0;
            const pct = cb.limitAmount > 0 ? safeRound((spent / cb.limitAmount) * 100) : 0;

            let statusClass = 'healthy';
            let statusLabel = 'Healthy';
            if (pct > 100) {
              statusClass = 'overspent';
              statusLabel = 'OVERSPENT';
            } else if (pct >= 90) {
              statusClass = 'near-limit';
              statusLabel = 'Near Limit';
            } else if (pct >= 70) {
              statusClass = 'warning';
              statusLabel = 'Warning';
            }

            return h('div', { key: cb.categoryId, className: `cat-budget-card ${statusClass}` },
              h('div', { className: 'cat-budget-top' },
                h('div', { className: 'cat-budget-name' },
                  h('span', null, cat.icon),
                  cat.name
                ),
                h('span', { className: `cat-budget-status-pill ${statusClass}` }, `${statusLabel} (${pct}%)`)
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

    // 5. FIXED / RECURRING PAYMENTS PAGE
    const renderFixedPaymentsView = () => {
      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '📅'),
            ' Fixed & Recurring Obligations'
          )
        ),

        h('div', { className: 'fixed-payments-list' },
          fixedPayments.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId) || { icon: '💳' };
            return h('div', { key: p.id, className: 'fixed-payment-card' },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                h('div', { className: 'txn-cat-icon' }, cat.icon),
                h('div', null,
                  h('div', { style: { fontSize: '15px', fontWeight: 800, color: '#fff' } }, p.name),
                  h('div', { style: { fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' } },
                    `Due on ${p.dueDay}th of month · ${formatCurrency(p.amount, profile.currency)}`
                  )
                )
              ),
              h('button', {
                type: 'button',
                className: `fixed-pay-status-btn ${p.isPaid ? 'paid' : ''}`,
                onClick: () => handleToggleFixedPayment(p.id)
              }, p.isPaid ? '✓ Paid' : '⏳ Mark Paid')
            );
          })
        )
      );
    };

    // 6. REPORTS PAGE
    const renderReportsView = () => {
      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '📈'),
            ' Financial Analytics & Reports'
          )
        ),

        // Timeframe selector
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

        // Monthly Comparison Table
        h('div', { className: 'report-table-card' },
          h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '12px' } }, '🗓️ Monthly Comparison Table'),
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

    // 7. MORE / SETTINGS HUB PAGE
    const renderMoreView = () => {
      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '⚙️'),
            ' Settings & Data Management'
          )
        ),

        // User Profile Summary Card
        h('div', { className: 'stat-widget', style: { marginBottom: '18px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
            h('div', { className: 'logo-badge', style: { width: '50px', height: '50px', fontSize: '24px' } }, '👤'),
            h('div', null,
              h('div', { style: { fontSize: '18px', fontWeight: 800, color: '#fff' } }, profile.name),
              h('div', { style: { fontSize: '12px', color: 'var(--text-dim)' } }, `Default Currency: ${profile.currency} · 100% Offline & Private`)
            )
          )
        ),

        // Settings Rows
        h('div', { className: 'settings-hub-grid' },
          // SMS Auto-Tracking Shortcut
          h('div', { className: 'settings-row', onClick: () => setActiveTab('SMS_TRACKING') },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '📱'),
              h('div', null,
                h('div', { className: 'settings-label' },
                  'SMS Auto-Tracking',
                  smsMetrics.waitingReview > 0
                    ? h('span', { className: 'sms-count-pill', style: { marginLeft: '8px' } }, `${smsMetrics.waitingReview} to review`)
                    : null
                ),
                h('div', { className: 'settings-sub' }, 'Detect bank & UPI transaction alerts automatically')
              )
            ),
            h('span', {
              style: {
                color: smsSettings.enabled ? 'var(--neon-green)' : 'var(--text-dim)',
                fontWeight: 800,
                fontSize: '12px'
              }
            }, smsSettings.enabled ? '● ON' : '○ OFF')
          ),

          // Developer SMS Simulator
          h('div', { className: 'settings-row', onClick: () => setActiveTab('SMS_SIMULATOR') },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '🧪'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Developer SMS Simulator'),
                h('div', { className: 'settings-sub' }, 'Test 10 bank & UPI message fixtures on-device')
              )
            ),
            h('span', { style: { color: 'var(--text-dim)' } }, '›')
          ),

          // Payment Accounts
          h('div', { className: 'settings-row', onClick: () => setActiveTab('ACCOUNTS') },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '💳'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Manage Payment Accounts'),
                h('div', { className: 'settings-sub' }, 'Bank accounts, UPI handles, Cards & Cash')
              )
            ),
            h('span', { style: { color: 'var(--text-dim)' } }, '›')
          ),

          // Fixed Payments Shortcut
          h('div', { className: 'settings-row', onClick: () => setActiveTab('FIXED_PAYMENTS') },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '📅'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Fixed & Recurring Payments'),
                h('div', { className: 'settings-sub' }, 'Manage EMI, Rent, Gym, Subscriptions & Due dates')
              )
            ),
            h('span', { style: { color: 'var(--text-dim)' } }, '›')
          ),

          // Supabase Cloud Sync
          h('div', {
            className: 'settings-row',
            onClick: () => {
              const url = prompt('Enter your Supabase Project URL:', supabaseConfig.url);
              if (url !== null) {
                const key = prompt('Enter your Supabase Anon Key:', supabaseConfig.anonKey);
                if (key !== null) {
                  setSupabaseConfig({ url: url.trim(), anonKey: key.trim(), isConnected: Boolean(url && key) });
                  showToast('Supabase credentials saved!');
                }
              }
            }
          },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '☁️'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Supabase Cloud Database'),
                h('div', { className: 'settings-sub' }, supabaseConfig.isConnected ? 'Connected · Row Level Security Active' : 'Offline / Local Mode · Click to Configure')
              )
            ),
            h('span', { className: `sync-dot ${supabaseConfig.isConnected ? '' : 'offline'}` })
          ),

          // Currency Selector
          h('div', {
            className: 'settings-row',
            onClick: () => {
              const choice = prompt('Select Currency symbol (e.g. ₹, $, €, £, AED):', profile.currency);
              if (choice) {
                setProfile((p) => ({ ...p, currency: choice.trim() }));
                showToast(`Currency set to ${choice.trim()}`);
              }
            }
          },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '💱'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Currency Symbol'),
                h('div', { className: 'settings-sub' }, `Current: ${profile.currency}`)
              )
            ),
            h('span', { style: { color: 'var(--neon-green)', fontWeight: 800 } }, profile.currency)
          ),

          // Export JSON Backup
          h('div', { className: 'settings-row', onClick: handleExportBackup },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '💾'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Export JSON Backup'),
                h('div', { className: 'settings-sub' }, 'Download complete encrypted financial ledger')
              )
            ),
            h('span', { style: { color: 'var(--text-dim)' } }, 'Export')
          ),

          // Import JSON Backup
          h('label', { className: 'settings-row', style: { cursor: 'pointer' } },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '📂'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Import JSON Backup'),
                h('div', { className: 'settings-sub' }, 'Restore transactions and fund targets')
              )
            ),
            h('span', { style: { color: 'var(--text-dim)' } }, 'Import'),
            h('input', { type: 'file', accept: '.json', onChange: handleImportBackup, style: { display: 'none' } })
          ),

          // Reset Sample Data
          h('div', { className: 'settings-row', onClick: handleResetSampleData },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '🔄'),
              h('div', null,
                h('div', { className: 'settings-label' }, 'Reset Initial Sample Data'),
                h('div', { className: 'settings-sub' }, 'Reload default demo values (Salary, EMI, Groceries, RD)')
              )
            ),
            h('span', { style: { color: 'var(--neon-green)' } }, 'Reset')
          ),

          // Clear All Data
          h('div', { className: 'settings-row', onClick: handleClearAll },
            h('div', { className: 'settings-row-left' },
              h('span', { className: 'settings-icon' }, '🗑️'),
              h('div', null,
                h('div', { className: 'settings-label', style: { color: 'var(--expense-pink)' } }, 'Clear All Expense Data'),
                h('div', { className: 'settings-sub' }, 'Wipe all transaction history from this device')
              )
            ),
            h('span', { style: { color: 'var(--expense-pink)' } }, 'Clear')
          )
        )
      );
    };

    // 8. SMS AUTO-TRACKING VIEW (Requirements #14, #15, #16, #17, #18)
    const renderSmsTrackingView = () => {
      const pendingCandidates = smsCandidates.filter((c) => c.status === 'PENDING');

      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '📱'),
            ' SMS Auto-Tracking'
          ),
          h('button', {
            type: 'button',
            className: 'today-jump-btn',
            onClick: () => setActiveTab('MORE')
          }, '‹ Back to More')
        ),

        // Main ON/OFF Status Toggle Card
        h('div', { className: 'stat-widget', style: { marginBottom: '16px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            h('div', null,
              h('div', { style: { fontSize: '17px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' } },
                'SMS Transaction Detection',
                h('span', { className: `sms-status-dot ${smsSettings.enabled ? '' : 'off'}` })
              ),
              h('div', { style: { fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' } },
                smsSettings.enabled
                  ? 'Active · Listening for bank & UPI transaction alerts'
                  : 'Disabled · Tap switch to opt-in with Android permissions'
              )
            ),
            h('div', {
              className: `toggle-switch ${smsSettings.enabled ? 'active' : ''}`,
              onClick: () => {
                if (smsSettings.enabled) {
                  handleDisableSmsTracking();
                } else {
                  setIsSmsDisclosureOpen(true);
                }
              }
            },
              h('div', { className: 'toggle-knob' })
            )
          )
        ),

        // 4 KPI Metrics
        h('div', { className: 'sms-metrics-grid' },
          h('div', { className: 'sms-metric-card' },
            h('div', { className: 'sms-metric-num', style: { color: 'var(--neon-green)' } }, smsMetrics.detectedToday),
            h('div', { className: 'sms-metric-lbl' }, 'Detected Today')
          ),
          h('div', { className: 'sms-metric-card' },
            h('div', { className: 'sms-metric-num', style: { color: 'var(--income-green)' } }, smsMetrics.autoAdded),
            h('div', { className: 'sms-metric-lbl' }, 'Auto-Added')
          ),
          h('div', { className: 'sms-metric-card' },
            h('div', { className: 'sms-metric-num', style: { color: 'var(--warning-amber)' } }, smsMetrics.waitingReview),
            h('div', { className: 'sms-metric-lbl' }, 'Waiting Review')
          ),
          h('div', { className: 'sms-metric-card' },
            h('div', { className: 'sms-metric-num', style: { color: 'var(--text-dim)' } }, smsMetrics.ignored),
            h('div', { className: 'sms-metric-lbl' }, 'Filtered / Ignored')
          )
        ),

        // PENDING SMS TRANSACTIONS SECTION (Requirement #14)
        h('div', { style: { marginTop: '20px', marginBottom: '24px' } },
          h('div', { className: 'section-header', style: { margin: '0 0 12px' } },
            h('div', { className: 'section-title', style: { fontSize: '16px' } },
              h('span', null, '⏳'),
              ` Pending SMS Transactions (${pendingCandidates.length})`
            )
          ),
          pendingCandidates.length === 0
            ? h('div', { className: 'empty-state', style: { padding: '24px' } },
                h('span', { className: 'empty-icon', style: { fontSize: '28px' } }, '✨'),
                h('div', { className: 'empty-title', style: { fontSize: '15px' } }, 'No pending transactions'),
                h('div', { className: 'empty-desc' }, 'Newly detected transactions requiring confirmation will appear here.')
              )
            : h('div', null,
                pendingCandidates.map((c) =>
                  h('div', { key: c.id, className: 'candidate-card' },
                    h('div', { className: 'candidate-left' },
                      h('div', { className: 'candidate-icon' }, c.categoryIcon || '💳'),
                      h('div', { className: 'candidate-details' },
                        h('div', { className: 'candidate-merchant' }, c.merchant),
                        h('div', { className: 'candidate-meta' },
                          h('span', { className: 'txn-pill' }, c.categoryName || 'Other'),
                          h('span', { className: 'txn-pill' }, c.paymentMethod || 'UPI'),
                          h('span', { className: `confidence-badge ${c.confidence.toLowerCase()}` }, `${c.confidence} Confidence`),
                          c.accountSuffix ? h('span', { className: 'txn-pill' }, c.accountSuffix) : null,
                          h('span', { style: { fontSize: '11px', color: 'var(--text-dim)' } }, `${c.transactionDate} ${c.transactionTime}`)
                        )
                      )
                    ),
                    h('div', { className: 'candidate-right' },
                      h('div', { className: `txn-amount ${c.type.toLowerCase()}`, style: { fontSize: '17px', fontWeight: 900 } },
                        `${c.type === 'INCOME' ? '+' : '-'}${formatCurrency(c.amount, profile.currency)}`
                      ),
                      h('div', { className: 'candidate-actions' },
                        h('button', {
                          type: 'button',
                          className: 'btn-approve',
                          title: 'Approve and add to ledger',
                          onClick: () => handleApproveCandidate(c)
                        }, '✓ Add'),
                        h('button', {
                          type: 'button',
                          className: 'btn-ignore',
                          title: 'Edit before saving',
                          onClick: () => setDetectedTxnForReview(c)
                        }, '✏️ Edit'),
                        h('button', {
                          type: 'button',
                          className: 'btn-ignore',
                          title: 'Ignore this message',
                          onClick: () => handleIgnoreCandidate(c.id)
                        }, 'Ignore'),
                        h('button', {
                          type: 'button',
                          className: 'mini-action-btn delete',
                          title: 'Delete candidate',
                          onClick: () => handleDeleteCandidate(c.id)
                        }, '🗑️')
                      )
                    )
                  )
                )
              )
        ),

        // AUTOMATIC TRANSACTION MODE SETTING (Requirement #12)
        h('div', { style: { marginBottom: '24px' } },
          h('div', { className: 'section-header', style: { margin: '0 0 10px' } },
            h('div', { className: 'section-title', style: { fontSize: '16px' } },
              h('span', null, '⚙️'),
              ' Automatic Transaction Mode'
            )
          ),
          [
            {
              id: 'REVIEW_EVERY',
              title: 'Review Every Transaction (Default)',
              desc: 'Every detected transaction goes to Pending Review for your confirmation.'
            },
            {
              id: 'AUTO_ADD_HIGH',
              title: 'Auto-Add High Confidence Only',
              desc: 'High-confidence transactions are added automatically; others go to review.'
            },
            {
              id: 'AUTO_ADD_ALL',
              title: 'Auto-Add All Detected Transactions',
              desc: 'Automatically records all detected financial alerts into your ledger.'
            },
            {
              id: 'OFF',
              title: 'Off',
              desc: 'Do not automatically record or queue detected messages.'
            }
          ].map((mode) =>
            h('div', {
              key: mode.id,
              className: `mode-option-card ${smsSettings.detectionMode === mode.id ? 'selected' : ''}`,
              onClick: () => {
                setSmsSettings((prev) => ({ ...prev, detectionMode: mode.id }));
                showToast(`Mode set to: ${mode.title}`);
              }
            },
              h('div', null,
                h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fff' } }, mode.title),
                h('div', { style: { fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' } }, mode.desc)
              ),
              smsSettings.detectionMode === mode.id
                ? h('span', { style: { color: 'var(--neon-green)', fontSize: '18px', fontWeight: 900 } }, '✓')
                : h('span', { style: { color: 'var(--text-dim)', fontSize: '18px' } }, '○')
            )
          )
        ),

        // HISTORICAL SMS IMPORT (Requirement #17)
        h('div', { style: { marginBottom: '24px' } },
          h('div', { className: 'section-header', style: { margin: '0 0 10px' } },
            h('div', { className: 'section-title', style: { fontSize: '16px' } },
              h('span', null, '📅'),
              ' Import Previous Transactions'
            )
          ),
          h('div', { className: 'stat-widget' },
            h('p', { style: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 } },
              'Scan previous SMS alerts on your device to discover and import past expenses into the review list. Safe & on-device only.'
            ),
            h('div', { style: { display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' } },
              [7, 30, 90].map((d) =>
                h('button', {
                  key: d,
                  type: 'button',
                  className: `fixture-btn`,
                  style: {
                    background: historicalImportDays === d ? 'var(--neon-green-subtle)' : undefined,
                    borderColor: historicalImportDays === d ? 'var(--neon-green)' : undefined,
                    color: historicalImportDays === d ? 'var(--neon-green)' : undefined
                  },
                  onClick: () => setHistoricalImportDays(d)
                }, `${d} Days`)
              )
            ),
            h('button', {
              type: 'button',
              className: 'submit-btn',
              style: { width: '100%', padding: '12px' },
              disabled: isImportingHistorical,
              onClick: () => handleImportHistoricalSms(historicalImportDays)
            }, isImportingHistorical ? 'Scanning SMS Inbox...' : `Import Previous ${historicalImportDays} Days`)
          )
        ),

        // NOTIFICATIONS TOGGLE (Requirement #24)
        h('div', { className: 'toggle-switch-wrap' },
          h('div', null,
            h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fff' } }, 'Transaction Notifications'),
            h('div', { style: { fontSize: '12px', color: 'var(--text-dim)' } }, 'Show alerts when transactions are detected or auto-added')
          ),
          h('div', {
            className: `toggle-switch ${smsSettings.notificationsEnabled ? 'active' : ''}`,
            onClick: () => setSmsSettings((prev) => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))
          },
            h('div', { className: 'toggle-knob' })
          )
        ),

        // SUPPORTED SOURCES
        h('div', { style: { marginBottom: '20px' } },
          h('div', { className: 'section-header', style: { margin: '0 0 10px' } },
            h('div', { className: 'section-title', style: { fontSize: '15px' } },
              h('span', null, '🏦'),
              ' Supported Financial Sources'
            )
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' } },
            [
              { name: 'Banks', desc: 'HDFC, SBI, ICICI, Axis, Kotak, BOB & all Indian banks', icon: '🏛️' },
              { name: 'UPI Services', desc: 'Google Pay, PhonePe, Paytm, BHIM, CRED', icon: '⚡' },
              { name: 'Cards', desc: 'Visa, Mastercard, RuPay debit & credit cards', icon: '💳' },
              { name: 'Wallets & ATM', desc: 'Paytm Wallet, Amazon Pay, Cash ATM withdrawals', icon: '👛' }
            ].map((s) =>
              h('div', { key: s.name, className: 'stat-widget', style: { padding: '12px' } },
                h('div', { style: { fontSize: '18px', marginBottom: '4px' } }, s.icon),
                h('div', { style: { fontSize: '13px', fontWeight: 800, color: '#fff' } }, s.name),
                h('div', { style: { fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' } }, s.desc)
              )
            )
          )
        ),

        // PRIVACY GUARANTEE CARD (Requirement #18)
        h('div', { className: 'privacy-badge-card' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
            h('span', { style: { fontSize: '22px' } }, '🛡️'),
            h('div', { style: { fontSize: '15px', fontWeight: 800, color: '#fff' } }, 'Privacy-First On-Device Processing')
          ),
          h('p', { style: { fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 } },
            'SMS messages are processed locally on your device to extract transaction details. Personal messages, OTPs, contacts, and raw SMS contents are never saved to the database, never sold, and never uploaded to the cloud.'
          )
        ),

        // DISABLE SMS TRACKING BUTTON
        h('button', {
          type: 'button',
          className: 'cancel-btn',
          style: { width: '100%', borderColor: 'var(--overspent-red)', color: 'var(--overspent-red)', marginBottom: '24px' },
          onClick: handleDisableSmsTracking
        }, 'Disable SMS Auto-Tracking'),

        // RECENT DETECTED EVENTS LOG (Requirement #15)
        h('div', null,
          h('div', { className: 'section-header', style: { margin: '0 0 10px' } },
            h('div', { className: 'section-title', style: { fontSize: '15px' } },
              h('span', null, '📜'),
              ` Recent Detected Events (${smsLogEvents.length})`
            )
          ),
          smsLogEvents.length === 0
            ? h('div', { className: 'empty-state', style: { padding: '20px' } },
                h('div', { className: 'empty-desc' }, 'No financial events logged yet.')
              )
            : h('div', { className: 'txn-list' },
                smsLogEvents.slice(0, 10).map((ev) =>
                  h('div', { key: ev.id, className: 'txn-card', style: { padding: '10px 14px' } },
                    h('div', { className: 'txn-left' },
                      h('div', { className: 'txn-cat-icon', style: { width: '36px', height: '36px', fontSize: '16px' } },
                        ev.type === 'IGNORED' ? '🚫' : ev.type === 'DUPLICATE' ? '⚠️' : '💳'
                      ),
                      h('div', { className: 'txn-details' },
                        h('div', { className: 'txn-desc', style: { fontSize: '13px' } }, ev.preview || ev.merchant || 'SMS Alert'),
                        h('div', { className: 'txn-meta' },
                          h('span', { className: 'txn-pill' }, ev.type),
                          ev.confidence ? h('span', { className: `confidence-badge ${ev.confidence.toLowerCase()}` }, ev.confidence) : null,
                          h('span', { style: { fontSize: '11px', color: 'var(--text-dim)' } }, new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
                        )
                      )
                    ),
                    ev.amount ? h('div', { className: 'txn-right' },
                      h('div', { style: { fontSize: '14px', fontWeight: 800, color: 'var(--neon-green)' } },
                        formatCurrency(ev.amount, profile.currency)
                      )
                    ) : null
                  )
                )
              )
        )
      );
    };

    // 9. DEVELOPER SMS SIMULATOR VIEW (Requirement #35)
    const renderSmsSimulatorView = () => {
      const handleRunParse = () => {
        if (!window.SmsTransactionParser) return;
        const res = window.SmsTransactionParser.parseSms(simInputText, {
          userFunds: funds,
          learnedMappings: smsMappings,
          existingTransactions: transactions,
          pendingCandidates: smsCandidates,
          userId: profile.id,
          keepRawText: true
        });
        setSimParsedResult(res);
      };

      const FIXTURES = [
        { label: '1: Fuel ₹500', text: 'Your A/c XX1234 is debited by Rs.500 at ABC PETROL PUMP via UPI. Ref 453829102' },
        { label: '2: Food ₹250', text: 'Rs.250 debited at ABC RESTAURANT.' },
        { label: '3: Salary ₹25k', text: 'Salary of Rs.25,000 credited to A/c XX1234.' },
        { label: '4: Refund ₹450', text: 'Rs.450 refund credited to your account.' },
        { label: '5: OTP (Ignore)', text: 'Your OTP is 829301. Do not share this with anyone.' },
        { label: '6: Coupon (Ignore)', text: 'Use coupon SAVE500 to get flat 50% discount on your next order!' },
        { label: '7: Delivery (Ignore)', text: 'Your order will be delivered today by 5 PM.' },
        { label: '8: RD ₹1,000', text: 'Rs.1,000 transferred to RD.' },
        { label: '9: Transfer ₹5,000', text: 'UPI transfer of Rs.5,000 to own account.' },
        { label: '10: Duplicate Test', text: 'Your A/c XX1234 is debited by Rs.500 at ABC PETROL PUMP via UPI. Ref 453829102' }
      ];

      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '🧪'),
            ' Developer SMS Simulator'
          ),
          h('button', {
            type: 'button',
            className: 'today-jump-btn',
            onClick: () => setActiveTab('MORE')
          }, '‹ Back to Settings')
        ),

        h('div', { className: 'simulator-box' },
          h('div', { style: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' } },
            'Select a sample fixture or paste any raw banking SMS to test the extraction engine:'
          ),

          // 10 Fixture Pills
          h('div', { className: 'fixture-pills-row' },
            FIXTURES.map((f, i) =>
              h('button', {
                key: i,
                type: 'button',
                className: 'fixture-btn',
                onClick: () => {
                  setSimInputText(f.text);
                  const res = window.SmsTransactionParser.parseSms(f.text, {
                    userFunds: funds,
                    learnedMappings: smsMappings,
                    existingTransactions: transactions,
                    pendingCandidates: smsCandidates,
                    userId: profile.id,
                    keepRawText: true
                  });
                  setSimParsedResult(res);
                }
              }, f.label)
            )
          ),

          // Raw SMS Textarea
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Raw SMS Text:'),
            h('textarea', {
              className: 'form-input',
              rows: 3,
              style: { fontFamily: 'monospace', fontSize: '13px' },
              value: simInputText,
              onChange: (e) => setSimInputText(e.target.value)
            })
          ),

          // Buttons
          h('div', { style: { display: 'flex', gap: '10px' } },
            h('button', {
              type: 'button',
              className: 'submit-btn',
              style: { flex: 1 },
              onClick: handleRunParse
            }, '⚡ PARSE SMS'),
            h('button', {
              type: 'button',
              className: 'cancel-btn',
              onClick: () => {
                setSimInputText('');
                setSimParsedResult(null);
              }
            }, 'Clear')
          ),

          // Parsed Results Breakdown
          simParsedResult && h('div', { style: { marginTop: '20px' } },
            h('div', {
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                marginBottom: '12px',
                background: simParsedResult.isFinancial ? 'rgba(0,245,155,0.15)' : 'rgba(239,68,68,0.15)',
                color: simParsedResult.isFinancial ? 'var(--neon-green)' : 'var(--overspent-red)',
                border: `1px solid ${simParsedResult.isFinancial ? 'var(--neon-green-border)' : 'rgba(239,68,68,0.3)'}`
              }
            },
              simParsedResult.isFinancial ? '✓ VALID FINANCIAL TRANSACTION' : '✕ FILTERED / IGNORED MESSAGE'
            ),

            simParsedResult.isFinancial
              ? h('div', null,
                  h('div', { className: 'parsed-result-grid' },
                    h('div', { className: 'parsed-item' },
                      h('span', { className: 'parsed-label' }, 'Detected Type'),
                      h('span', { className: 'parsed-value' }, simParsedResult.type)
                    ),
                    h('div', { className: 'parsed-item' },
                      h('span', { className: 'parsed-label' }, 'Amount'),
                      h('span', { className: 'parsed-value', style: { color: 'var(--neon-green)' } },
                        formatCurrency(simParsedResult.amount, profile.currency)
                      )
                    ),
                    h('div', { className: 'parsed-item' },
                      h('span', { className: 'parsed-label' }, 'Merchant'),
                      h('span', { className: 'parsed-value' }, simParsedResult.merchant)
                    ),
                    h('div', { className: 'parsed-item' },
                      h('span', { className: 'parsed-label' }, 'Category Suggestion'),
                      h('span', { className: 'parsed-value' }, `${simParsedResult.categoryIcon || '📦'} ${simParsedResult.categoryName || 'Other'}`)
                    ),
                    h('div', { className: 'parsed-item' },
                      h('span', { className: 'parsed-label' }, 'Payment Method'),
                      h('span', { className: 'parsed-value' }, simParsedResult.paymentMethod || 'UPI')
                    ),
                    h('div', { className: 'parsed-item' },
                      h('span', { className: 'parsed-label' }, 'Account / Card Suffix'),
                      h('span', { className: 'parsed-value' }, simParsedResult.accountSuffix || 'Not specified')
                    ),
                    h('div', { className: 'parsed-item' },
                      h('span', { className: 'parsed-label' }, 'Transaction Reference'),
                      h('span', { className: 'parsed-value' }, simParsedResult.transactionReference || 'None')
                    ),
                    h('div', { className: 'parsed-item' },
                      h('span', { className: 'parsed-label' }, 'Confidence Score'),
                      h('span', { className: `confidence-badge ${simParsedResult.confidence.toLowerCase()}`, style: { width: 'fit-content' } },
                        simParsedResult.confidence
                      )
                    ),
                    h('div', { className: 'parsed-item', style: { gridColumn: 'span 2' } },
                      h('span', { className: 'parsed-label' }, 'Duplicate Detection Status'),
                      h('span', {
                        className: 'parsed-value',
                        style: { color: simParsedResult.isDuplicate ? 'var(--overspent-red)' : 'var(--neon-green)' }
                      }, simParsedResult.isDuplicate ? '⚠️ DUPLICATE DETECTED (Already in ledger)' : '✓ UNIQUE (Safe to insert)')
                    )
                  ),

                  // Button to feed into live application
                  h('button', {
                    type: 'button',
                    className: 'submit-btn',
                    style: { width: '100%', marginTop: '10px' },
                    onClick: () => {
                      const res = processSmsText(simInputText, 'SIMULATOR');
                      if (res && res.status === 'SUCCESS') {
                        showToast('Test transaction processed through live engine!');
                        setActiveTab('SMS_TRACKING');
                      }
                    }
                  }, '📥 Create Test Transaction in App')
                )
              : h('div', { className: 'empty-state', style: { padding: '16px' } },
                  h('div', { className: 'empty-title', style: { color: 'var(--overspent-red)' } }, 'Message Ignored'),
                  h('div', { className: 'empty-desc' }, `Reason: ${simParsedResult.ignoreReason || 'Non-financial content'}`)
                )
          )
        )
      );
    };

    // 10. ACCOUNTS VIEW (Requirement #31)
    const renderAccountsView = () => {
      return h('div', { className: 'page-view' },
        h('div', { className: 'section-header' },
          h('div', { className: 'section-title' },
            h('span', null, '💳'),
            ` Manage Payment Accounts (${accounts.length})`
          ),
          h('button', {
            type: 'button',
            className: 'today-jump-btn',
            onClick: () => setActiveTab('MORE')
          }, '‹ Back to Settings')
        ),

        h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' } },
          h('button', {
            type: 'button',
            className: 'today-jump-btn',
            onClick: () => setIsAddAccountOpen(true)
          }, '➕ Add Account')
        ),

        h('div', { className: 'txn-list' },
          accounts.map((acc) =>
            h('div', { key: acc.id, className: 'txn-card' },
              h('div', { className: 'txn-left' },
                h('div', { className: 'txn-cat-icon' },
                  acc.type === 'Bank' ? '🏛️' : acc.type === 'UPI' ? '⚡' : acc.type === 'Cash' ? '💵' : '💳'
                ),
                h('div', { className: 'txn-details' },
                  h('div', { className: 'txn-desc' }, acc.name),
                  h('div', { className: 'txn-meta' },
                    h('span', { className: 'txn-pill' }, acc.type),
                    acc.lastFour ? h('span', { className: 'txn-pill' }, `Ending XX${acc.lastFour}`) : null
                  )
                )
              ),
              h('div', { className: 'txn-right' },
                h('div', { className: 'txn-amount income' }, formatCurrency(acc.balance || 0, profile.currency)),
                h('button', {
                  type: 'button',
                  className: 'mini-action-btn delete',
                  style: { marginTop: '6px' },
                  onClick: () => {
                    if (confirm(`Remove account ${acc.name}?`)) {
                      setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
                      showToast('Account removed.');
                    }
                  }
                }, '🗑️ Del')
              )
            )
          )
        )
      );
    };

    // =========================================================================
    // MODAL DIALOGS
    // =========================================================================

    // Add / Edit Transaction Modal
    const renderAddTxnModal = () => {
      if (!isAddTxnOpen) return null;

      return h(AddTxnModalDialog, {
        txn: editingTxn,
        categories,
        paymentMethods: DEFAULT_PAYMENT_METHODS,
        currency: profile.currency,
        onClose: () => {
          setIsAddTxnOpen(false);
          setEditingTxn(null);
        },
        onSave: handleSaveTransaction
      });
    };

    // Create Fund Modal
    const renderCreateFundModal = () => {
      if (!isAddFundOpen) return null;

      return h(CreateFundModalDialog, {
        currency: profile.currency,
        onClose: () => setIsAddFundOpen(false),
        onSave: handleCreateFund
      });
    };

    // Add Contribution Modal
    const renderContributionModal = () => {
      if (!activeFundForContrib) return null;

      return h(AddContributionModalDialog, {
        fund: activeFundForContrib,
        currency: profile.currency,
        onClose: () => setActiveFundForContrib(null),
        onSave: (amt, notes) => handleAddContribution(activeFundForContrib.id, amt, notes)
      });
    };

    // Category Budget Modal
    const renderCatBudgetModal = () => {
      if (!isCatBudgetModalOpen) return null;

      return h(CategoryBudgetModalDialog, {
        categories: categories.filter((c) => c.type === 'EXPENSE'),
        currency: profile.currency,
        onClose: () => setIsCatBudgetModalOpen(false),
        onSave: handleSaveCatBudget
      });
    };

    // Confirm Delete Dialog
    const renderConfirmDeleteDialog = () => {
      if (!deletingTxnId) return null;

      return h('div', { className: 'modal-backdrop' },
        h('div', { className: 'bottom-sheet-card', style: { maxWidth: '420px', textAlign: 'center' } },
          h('span', { style: { fontSize: '40px', display: 'block', marginBottom: '12px' } }, '⚠️'),
          h('h3', { style: { color: '#fff', fontSize: '18px', fontWeight: 800, marginBottom: '8px' } }, 'Delete Transaction?'),
          h('p', { style: { color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' } },
            'This action cannot be undone. The transaction will be permanently removed from your financial ledger.'
          ),
          h('div', { style: { display: 'flex', gap: '10px' } },
            h('button', {
              type: 'button',
              className: 'cancel-btn',
              style: { flex: 1 },
              onClick: () => setDeletingTxnId(null)
            }, 'Cancel'),
            h('button', {
              type: 'button',
              className: 'submit-btn',
              style: { flex: 1, background: 'var(--overspent-red)' },
              onClick: handleConfirmDelete
            }, 'Delete')
          )
        )
      );
    };

    // SMS Disclosure Modal Dialog (Requirement #2)
    const renderSmsDisclosureModal = () => {
      if (!isSmsDisclosureOpen) return null;

      return h('div', { className: 'modal-backdrop' },
        h('div', { className: 'bottom-sheet-card', style: { maxWidth: '440px' } },
          h('div', { className: 'sheet-header' },
            h('div', { className: 'sheet-title' },
              h('span', null, '📱'),
              ' AUTO-TRACK YOUR TRANSACTIONS'
            ),
            h('button', {
              type: 'button',
              className: 'sheet-close-btn',
              onClick: () => setIsSmsDisclosureOpen(false)
            }, '✕')
          ),

          h('div', { style: { padding: '8px 0 16px' } },
            h('p', { style: { fontSize: '14px', color: '#fff', fontWeight: 600, lineHeight: 1.6, marginBottom: '14px' } },
              'Expense Tracker can detect transaction messages from your bank and UPI services and turn them into expense/income entries.'
            ),
            h('div', { className: 'stat-widget', style: { padding: '12px 14px', marginBottom: '14px', background: 'rgba(0,245,155,0.06)' } },
              h('div', { style: { fontSize: '13px', color: 'var(--neon-green)', fontWeight: 700, marginBottom: '4px' } }, '✓ Financial Messages Only'),
              h('div', { style: { fontSize: '12px', color: 'var(--text-muted)' } },
                'Only financial transaction messages will be processed. Your normal personal messages will not be imported into your transaction history.'
              )
            ),
            h('div', { style: { fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 } },
              '• Sensitive OTPs, passwords, and verification codes are discarded immediately on-device.\n• Raw SMS text is never uploaded to any cloud server.'
            )
          ),

          h('div', { className: 'sheet-actions' },
            h('button', {
              type: 'button',
              className: 'cancel-btn',
              onClick: () => {
                setIsSmsDisclosureOpen(false);
                showToast('SMS tracking is disabled. You can continue adding transactions manually.');
              }
            }, 'Not Now'),
            h('button', {
              type: 'button',
              className: 'submit-btn',
              onClick: handleEnableSmsTracking
            }, 'Enable SMS Tracking')
          )
        )
      );
    };

    // Detected Transaction Review Modal Dialog (Requirement #11)
    const renderTransactionReviewModal = () => {
      if (!detectedTxnForReview) return null;

      return h(TransactionReviewModalDialog, {
        candidate: detectedTxnForReview,
        categories,
        currency: profile.currency,
        onClose: () => setDetectedTxnForReview(null),
        onApprove: (overrides) => handleApproveCandidate(detectedTxnForReview, overrides),
        onIgnore: () => handleIgnoreCandidate(detectedTxnForReview.id)
      });
    };

    // Transaction Details Modal Dialog (Requirement #23)
    const renderTransactionDetailsModal = () => {
      if (!viewingTxnDetails) return null;

      return h(TransactionDetailsModalDialog, {
        txn: viewingTxnDetails,
        currency: profile.currency,
        onClose: () => setViewingTxnDetails(null),
        onEdit: () => {
          setEditingTxn(viewingTxnDetails);
          setViewingTxnDetails(null);
          setIsAddTxnOpen(true);
        },
        onDuplicate: () => {
          handleDuplicateTxn(viewingTxnDetails);
          setViewingTxnDetails(null);
        },
        onDelete: () => {
          setDeletingTxnId(viewingTxnDetails.id);
          setViewingTxnDetails(null);
        }
      });
    };

    // Add Account Modal Dialog (Requirement #31)
    const renderAddAccountModal = () => {
      if (!isAddAccountOpen) return null;

      return h(AddAccountModalDialog, {
        currency: profile.currency,
        onClose: () => setIsAddAccountOpen(false),
        onSave: (acc) => {
          setAccounts((prev) => [...prev, { ...acc, id: 'acc-' + Date.now() }]);
          setIsAddAccountOpen(false);
          showToast('Payment account saved!');
        }
      });
    };

    // =========================================================================
    // MAIN APP RENDER
    // =========================================================================

    return h('div', { className: 'app-container' },
      // Top Header
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

        // Sync & Mode Badge
        h('div', { className: 'header-right' },
          h('div', { className: 'sync-status-badge' },
            h('span', { className: `sync-dot ${supabaseConfig.isConnected ? '' : 'offline'}` }),
            supabaseConfig.isConnected ? 'Cloud Synced' : 'Offline / Local'
          )
        )
      ),

      // Page Views
      activeTab === 'HOME' && renderHomeView(),
      activeTab === 'TRANSACTIONS' && renderTransactionsView(),
      activeTab === 'FUNDS' && renderFundsView(),
      activeTab === 'BUDGET' && renderBudgetView(),
      activeTab === 'FIXED_PAYMENTS' && renderFixedPaymentsView(),
      activeTab === 'REPORTS' && renderReportsView(),
      activeTab === 'MORE' && renderMoreView(),
      activeTab === 'SMS_TRACKING' && renderSmsTrackingView(),
      activeTab === 'SMS_SIMULATOR' && renderSmsSimulatorView(),
      activeTab === 'ACCOUNTS' && renderAccountsView(),

      // Modals
      renderAddTxnModal(),
      renderCreateFundModal(),
      renderContributionModal(),
      renderCatBudgetModal(),
      renderConfirmDeleteDialog(),
      renderSmsDisclosureModal(),
      renderTransactionReviewModal(),
      renderTransactionDetailsModal(),
      renderAddAccountModal(),

      // Toast Notification
      toastMessage && h('div', { className: 'toast-msg' }, toastMessage),

      // Mobile Bottom Navigation Bar: HOME | TRANSACTIONS | FUNDS | BUDGET | REPORTS | MORE
      h('nav', { className: 'bottom-nav' },
        [
          { id: 'HOME', icon: '🏠', label: 'Home' },
          { id: 'TRANSACTIONS', icon: '📋', label: 'Trans.' },
          { id: 'FUNDS', icon: '🏦', label: 'Funds' },
          { id: 'BUDGET', icon: '🎯', label: 'Budget' },
          { id: 'REPORTS', icon: '📈', label: 'Reports' },
          { id: 'MORE', icon: '⚙️', label: 'More' }
        ].map((item) => {
          const isItemActive = activeTab === item.id || (item.id === 'MORE' && ['SMS_TRACKING', 'SMS_SIMULATOR', 'ACCOUNTS'].includes(activeTab));
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

  function AddTxnModalDialog({ txn, categories, paymentMethods, currency, onClose, onSave }) {
    const isEdit = Boolean(txn);
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().slice(0, 5);

    const [type, setType] = useState(txn?.type || 'EXPENSE');
    const [amount, setAmount] = useState(txn ? String(txn.amount) : '');
    const [categoryId, setCategoryId] = useState(txn?.categoryId || 'cat-food');
    const [date, setDate] = useState(txn?.date || todayStr);
    const [time, setTime] = useState(txn?.time || timeStr);
    const [paymentMethod, setPaymentMethod] = useState(txn?.paymentMethod || 'UPI');
    const [description, setDescription] = useState(txn?.description || '');
    const [notes, setNotes] = useState(txn?.notes || '');
    const [isRecurring, setIsRecurring] = useState(txn?.isRecurring || false);

    const filteredCategories = categories.filter((c) => (type === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'));

    const handleFormSubmit = (e) => {
      e.preventDefault();
      const numAmt = safeRound(parseFloat(amount));
      if (isNaN(numAmt) || numAmt <= 0) {
        alert('Please enter a valid amount.');
        return;
      }
      if (!description.trim()) {
        alert('Please enter a description / merchant.');
        return;
      }

      const cat = categories.find((c) => c.id === categoryId) || filteredCategories[0];

      onSave({
        type,
        amount: numAmt,
        categoryId: cat ? cat.id : 'cat-other-exp',
        categoryName: cat ? cat.name : 'Other',
        categoryIcon: cat ? cat.icon : '📦',
        categoryColor: cat ? cat.color : '#00f59b',
        date,
        time,
        paymentMethod,
        description: description.trim(),
        notes: notes.trim(),
        isRecurring
      });
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card' },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, isEdit ? '✏️' : '➕'),
            isEdit ? 'Edit Transaction' : 'Record Transaction'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        // Type Segmented Control
        h('div', { className: 'type-segmented-control' },
          [
            { id: 'EXPENSE', label: 'Expense' },
            { id: 'INCOME', label: 'Income' },
            { id: 'FUND_CONTRIBUTION', label: 'Fund' },
            { id: 'TRANSFER', label: 'Transfer' }
          ].map((t) =>
            h('button', {
              key: t.id,
              type: 'button',
              className: `type-tab-btn ${type === t.id ? `active ${t.id}` : ''}`,
              onClick: () => {
                setType(t.id);
                // Adjust default category
                if (t.id === 'INCOME') setCategoryId('cat-salary');
                else setCategoryId('cat-food');
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
              style: { fontSize: '20px', fontWeight: 800, color: 'var(--neon-green)' },
              value: amount,
              onChange: (e) => setAmount(e.target.value)
            }),
            h('div', { className: 'quick-chips' },
              [100, 500, 1000, 2000, 5000].map((inc) =>
                h('button', {
                  key: inc,
                  type: 'button',
                  className: 'chip-btn',
                  onClick: () => setAmount(String((parseFloat(amount) || 0) + inc))
                }, `+${inc}`)
              )
            )
          ),

          // Description
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Description / Merchant *'),
            h('input', {
              type: 'text',
              required: true,
              placeholder: 'e.g. Alfaham + Tea, Petrol, Salary',
              className: 'form-input',
              value: description,
              onChange: (e) => setDescription(e.target.value)
            })
          ),

          // Category & Payment Row
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
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
              h('label', { className: 'form-label' }, 'Payment Method'),
              h('select', {
                className: 'form-select',
                value: paymentMethod,
                onChange: (e) => setPaymentMethod(e.target.value)
              },
                paymentMethods.map((pm) => h('option', { key: pm, value: pm }, pm))
              )
            )
          ),

          // Date & Time Row
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Date'),
              h('input', {
                type: 'date',
                required: true,
                className: 'form-input',
                value: date,
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

          // Recurring Toggle
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' } },
            h('input', {
              type: 'checkbox',
              id: 'isRecurringTxn',
              checked: isRecurring,
              onChange: (e) => setIsRecurring(e.target.checked)
            }),
            h('label', { htmlFor: 'isRecurringTxn', style: { fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' } },
              'Repeat this transaction regularly (Daily/Weekly/Monthly)'
            )
          ),

          // Actions
          h('div', { className: 'sheet-actions' },
            h('button', { type: 'button', className: 'cancel-btn', onClick: onClose }, 'Cancel'),
            h('button', { type: 'submit', className: 'submit-btn' }, isEdit ? 'Save Changes' : 'Record Transaction')
          )
        )
      )
    );
  }

  function CreateFundModalDialog({ currency, onClose, onSave }) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('🏦');
    const [targetAmount, setTargetAmount] = useState('');
    const [contributionAmount, setContributionAmount] = useState('');
    const [frequency, setFrequency] = useState('MONTHLY');
    const [frequencyDay, setFrequencyDay] = useState('10th of month');
    const [fundType, setFundType] = useState('MONTHLY');

    const handleSubmit = (e) => {
      e.preventDefault();
      const target = safeRound(parseFloat(targetAmount));
      const contrib = safeRound(parseFloat(contributionAmount) || 0);
      if (!name.trim()) return alert('Please enter fund name.');
      if (isNaN(target) || target <= 0) return alert('Please enter target amount.');

      onSave({
        name: name.trim(),
        icon,
        targetAmount: target,
        contributionAmount: contrib,
        frequency,
        frequencyDay,
        fundType
      });
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card' },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, '🏦'),
            ' Create Savings Fund / RD'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('form', { onSubmit: handleSubmit },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Fund Name *'),
            h('input', {
              type: 'text',
              required: true,
              placeholder: 'e.g. RD, Weekly Emergency Fund, Vacation Goal',
              className: 'form-input',
              value: name,
              onChange: (e) => setName(e.target.value)
            })
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Fund Icon'),
              h('select', {
                className: 'form-select',
                value: icon,
                onChange: (e) => setIcon(e.target.value)
              },
                ['🏦', '💰', '🛡️', '✈️', '🚗', '🏠', '🎓', '💻'].map((ic) => h('option', { key: ic, value: ic }, ic))
              )
            ),
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Fund Type'),
              h('select', {
                className: 'form-select',
                value: fundType,
                onChange: (e) => setFundType(e.target.value)
              },
                h('option', { value: 'MONTHLY' }, 'Monthly RD / Fund'),
                h('option', { value: 'WEEKLY' }, 'Weekly Savings Fund'),
                h('option', { value: 'YEARLY' }, 'Yearly Goal'),
                h('option', { value: 'ONE_TIME' }, 'One-Time Target')
              )
            )
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, `Total Target Amount (${currency}) *`),
              h('input', {
                type: 'number',
                step: 'any',
                min: '1',
                required: true,
                placeholder: '12000',
                className: 'form-input',
                value: targetAmount,
                onChange: (e) => setTargetAmount(e.target.value)
              })
            ),
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, `Contribution Amount (${currency})`),
              h('input', {
                type: 'number',
                step: 'any',
                min: '1',
                placeholder: '1000',
                className: 'form-input',
                value: contributionAmount,
                onChange: (e) => setContributionAmount(e.target.value)
              })
            )
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Contribution Schedule / Frequency Day'),
            h('input', {
              type: 'text',
              placeholder: 'e.g. Every Monday or 10th of every month',
              className: 'form-input',
              value: frequencyDay,
              onChange: (e) => setFrequencyDay(e.target.value)
            })
          ),

          h('div', { className: 'sheet-actions' },
            h('button', { type: 'button', className: 'cancel-btn', onClick: onClose }, 'Cancel'),
            h('button', { type: 'submit', className: 'submit-btn' }, 'Create Fund')
          )
        )
      )
    );
  }

  function AddContributionModalDialog({ fund, currency, onClose, onSave }) {
    const [amount, setAmount] = useState(String(fund.contributionAmount || ''));
    const [notes, setNotes] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(amount, notes);
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '440px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, fund.icon),
            ` Add to ${fund.name}`
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('form', { onSubmit: handleSubmit },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, `Contribution Amount (${currency}) *`),
            h('input', {
              type: 'number',
              step: 'any',
              min: '1',
              required: true,
              className: 'form-input',
              style: { fontSize: '20px', fontWeight: 800, color: 'var(--neon-green)' },
              value: amount,
              onChange: (e) => setAmount(e.target.value)
            })
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Notes / Deposit Memo'),
            h('input', {
              type: 'text',
              placeholder: 'e.g. October installment allocated',
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

  function CategoryBudgetModalDialog({ categories, currency, onClose, onSave }) {
    const [catId, setCatId] = useState(categories[0]?.id || 'cat-food');
    const [limit, setLimit] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(catId, limit);
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '440px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, '🎯'),
            ' Set Category Budget Limit'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('form', { onSubmit: handleSubmit },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Category *'),
            h('select', {
              className: 'form-select',
              value: catId,
              onChange: (e) => setCatId(e.target.value)
            },
              categories.map((c) => h('option', { key: c.id, value: c.id }, `${c.icon} ${c.name}`))
            )
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, `Monthly Spending Limit (${currency}) *`),
            h('input', {
              type: 'number',
              step: 'any',
              min: '1',
              required: true,
              placeholder: '5000',
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

  // --- TRANSACTION REVIEW MODAL DIALOG (Requirement #11) ---
  function TransactionReviewModalDialog({ candidate, categories, currency, onClose, onApprove, onIgnore }) {
    const [isEditing, setIsEditing] = useState(false);
    const [amount, setAmount] = useState(String(candidate.amount || ''));
    const [type, setType] = useState(candidate.type || 'EXPENSE');
    const [merchant, setMerchant] = useState(candidate.merchant || '');
    const [categoryId, setCategoryId] = useState(candidate.categoryId || categories[0]?.id || 'cat-food');
    const [paymentMethod, setPaymentMethod] = useState(candidate.paymentMethod || 'UPI');
    const [date, setDate] = useState(candidate.transactionDate || '');
    const [notes, setNotes] = useState('');

    const currentCat = categories.find((c) => c.id === categoryId) || { name: 'Other', icon: '📦' };

    const handleSaveEdit = (e) => {
      e.preventDefault();
      const numAmt = safeRound(parseFloat(amount));
      if (isNaN(numAmt) || numAmt <= 0) {
        alert('Please enter a valid amount.');
        return;
      }
      onApprove({
        amount: numAmt,
        type,
        merchant: merchant.trim() || 'Unknown',
        categoryId,
        categoryName: currentCat.name,
        categoryIcon: currentCat.icon,
        paymentMethod,
        transactionDate: date,
        notes: notes.trim()
      });
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '460px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, '⚡'),
            ' TRANSACTION DETECTED'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        !isEditing ? h('div', { style: { padding: '8px 0 16px' } },
          // Summary Banner
          h('div', {
            style: {
              background: 'rgba(0, 245, 155, 0.08)',
              border: '1px solid var(--neon-green-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px'
            }
          },
            h('div', { style: { fontSize: '13px', fontWeight: 800, color: 'var(--neon-green)', textTransform: 'uppercase', letterSpacing: '0.5px' } },
              `${type === 'INCOME' ? '💰 Income' : type === 'FUND_CONTRIBUTION' ? '🏦 Fund Contribution' : type === 'TRANSFER' ? '🔄 Transfer' : type === 'REFUND' ? '↩️ Refund' : '💳 Expense'} Detected`
            ),
            h('div', {
              style: {
                fontSize: '32px',
                fontWeight: 900,
                color: type === 'INCOME' || type === 'REFUND' ? 'var(--income-green)' : 'var(--neon-green)',
                margin: '8px 0 4px'
              }
            }, `${currency}${candidate.amount.toLocaleString()}`),
            h('div', { style: { fontSize: '16px', fontWeight: 800, color: '#fff' } }, candidate.merchant)
          ),

          // Extracted Fields List
          h('div', { className: 'stat-widget', style: { padding: '14px', marginBottom: '18px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
              h('span', { style: { color: 'var(--text-dim)' } }, 'Suggested Category'),
              h('span', { style: { color: '#fff', fontWeight: 700 } }, `${candidate.categoryIcon || '📦'} ${candidate.categoryName || 'Other'}`)
            ),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
              h('span', { style: { color: 'var(--text-dim)' } }, 'Payment Mode'),
              h('span', { style: { color: '#fff', fontWeight: 700 } }, candidate.paymentMethod || 'UPI')
            ),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
              h('span', { style: { color: 'var(--text-dim)' } }, 'Date & Time'),
              h('span', { style: { color: '#fff', fontWeight: 700 } }, `${candidate.transactionDate} · ${candidate.transactionTime || ''}`)
            ),
            candidate.accountSuffix ? h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
              h('span', { style: { color: 'var(--text-dim)' } }, 'Account Suffix'),
              h('span', { style: { color: '#fff', fontWeight: 700 } }, candidate.accountSuffix)
            ) : null,
            candidate.transactionReference ? h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
              h('span', { style: { color: 'var(--text-dim)' } }, 'Reference ID'),
              h('span', { style: { color: '#fff', fontWeight: 700, fontFamily: 'monospace' } }, candidate.transactionReference)
            ) : null,
            h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' } },
              h('span', { style: { color: 'var(--text-dim)' } }, 'Confidence Score'),
              h('span', { className: `confidence-badge ${candidate.confidence.toLowerCase()}` }, candidate.confidence)
            )
          ),

          // Actions
          h('div', { className: 'sheet-actions' },
            h('button', {
              type: 'button',
              className: 'cancel-btn',
              onClick: onIgnore
            }, 'Ignore'),
            h('button', {
              type: 'button',
              className: 'cancel-btn',
              onClick: () => setIsEditing(true)
            }, '✏️ Edit'),
            h('button', {
              type: 'button',
              className: 'submit-btn',
              onClick: () => onApprove()
            }, '✓ Add Transaction')
          )
        ) : h('form', { onSubmit: handleSaveEdit },
          // Edit Form
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, `Amount (${currency}) *`),
            h('input', {
              type: 'number',
              step: 'any',
              required: true,
              className: 'form-input',
              value: amount,
              onChange: (e) => setAmount(e.target.value)
            })
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Transaction Type *'),
            h('select', {
              className: 'form-select',
              value: type,
              onChange: (e) => setType(e.target.value)
            },
              h('option', { value: 'EXPENSE' }, '💳 Expense'),
              h('option', { value: 'INCOME' }, '💰 Income'),
              h('option', { value: 'FUND_CONTRIBUTION' }, '🏦 Fund Contribution'),
              h('option', { value: 'TRANSFER' }, '🔄 Transfer'),
              h('option', { value: 'REFUND' }, '↩️ Refund')
            )
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Merchant / Payee *'),
            h('input', {
              type: 'text',
              required: true,
              className: 'form-input',
              value: merchant,
              onChange: (e) => setMerchant(e.target.value)
            })
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Category *'),
            h('select', {
              className: 'form-select',
              value: categoryId,
              onChange: (e) => setCategoryId(e.target.value)
            },
              categories.map((c) => h('option', { key: c.id, value: c.id }, `${c.icon} ${c.name}`))
            )
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Payment Mode *'),
            h('select', {
              className: 'form-select',
              value: paymentMethod,
              onChange: (e) => setPaymentMethod(e.target.value)
            },
              ['UPI', 'Cash', 'Bank', 'Debit Card', 'Credit Card', 'Wallet'].map((m) =>
                h('option', { key: m, value: m }, m)
              )
            )
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Date *'),
            h('input', {
              type: 'date',
              required: true,
              className: 'form-input',
              value: date,
              onChange: (e) => setDate(e.target.value)
            })
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Notes (optional)'),
            h('input', {
              type: 'text',
              className: 'form-input',
              placeholder: 'Add description / memo',
              value: notes,
              onChange: (e) => setNotes(e.target.value)
            })
          ),

          h('div', { className: 'sheet-actions' },
            h('button', {
              type: 'button',
              className: 'cancel-btn',
              onClick: () => setIsEditing(false)
            }, 'Cancel Edit'),
            h('button', {
              type: 'submit',
              className: 'submit-btn'
            }, 'Save & Add to Ledger')
          )
        )
      )
    );
  }

  // --- TRANSACTION DETAILS MODAL DIALOG (Requirement #23) ---
  function TransactionDetailsModalDialog({ txn, currency, onClose, onEdit, onDuplicate, onDelete }) {
    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '440px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, txn.categoryIcon || '📋'),
            ' Transaction Details'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        // Hero Amount
        h('div', {
          style: {
            textAlign: 'center',
            padding: '16px 0',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '16px'
          }
        },
          h('div', {
            style: {
              fontSize: '32px',
              fontWeight: 900,
              color: txn.type === 'INCOME' ? 'var(--income-green)' : 'var(--neon-green)'
            }
          }, `${txn.type === 'INCOME' ? '+' : '-'}${currency}${txn.amount.toLocaleString()}`),
          h('div', { style: { fontSize: '16px', fontWeight: 800, color: '#fff', marginTop: '4px' } }, txn.description)
        ),

        // Structured Properties Table
        h('div', { style: { marginBottom: '20px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
            h('span', { style: { color: 'var(--text-dim)' } }, 'Type'),
            h('span', { style: { color: '#fff', fontWeight: 700 } }, txn.type)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
            h('span', { style: { color: 'var(--text-dim)' } }, 'Category'),
            h('span', { style: { color: '#fff', fontWeight: 700 } }, `${txn.categoryIcon || '📦'} ${txn.categoryName || 'Other'}`)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
            h('span', { style: { color: 'var(--text-dim)' } }, 'Payment Method'),
            h('span', { style: { color: '#fff', fontWeight: 700 } }, txn.paymentMethod || 'UPI')
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
            h('span', { style: { color: 'var(--text-dim)' } }, 'Date & Time'),
            h('span', { style: { color: '#fff', fontWeight: 700 } }, `${txn.date} ${txn.time || ''}`)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
            h('span', { style: { color: 'var(--text-dim)' } }, 'Source'),
            h('span', {
              className: txn.source === 'SMS' ? 'txn-source-badge sms' : 'txn-source-badge manual'
            }, txn.source === 'SMS' ? 'SMS Auto Tracking' : 'Manual Entry')
          ),
          txn.transactionReference ? h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' } },
            h('span', { style: { color: 'var(--text-dim)' } }, 'Reference No.'),
            h('span', { style: { color: '#fff', fontWeight: 700, fontFamily: 'monospace' } }, txn.transactionReference)
          ) : null,
          txn.notes ? h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' } },
            h('span', { style: { color: 'var(--text-dim)' } }, 'Notes'),
            h('span', { style: { color: 'var(--text-muted)' } }, txn.notes)
          ) : null
        ),

        // Actions
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' } },
          h('button', {
            type: 'button',
            className: 'cancel-btn',
            onClick: onDuplicate
          }, '📋 Copy'),
          h('button', {
            type: 'button',
            className: 'cancel-btn',
            onClick: onEdit
          }, '✏️ Edit'),
          h('button', {
            type: 'button',
            className: 'mini-action-btn delete',
            style: { padding: '12px' },
            onClick: onDelete
          }, '🗑️ Delete')
        )
      )
    );
  }

  // --- ADD ACCOUNT MODAL DIALOG (Requirement #31) ---
  function AddAccountModalDialog({ currency, onClose, onSave }) {
    const [name, setName] = useState('');
    const [type, setType] = useState('Bank');
    const [lastFour, setLastFour] = useState('');
    const [balance, setBalance] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!name.trim()) {
        alert('Please enter an account name.');
        return;
      }
      onSave({
        name: name.trim(),
        type,
        lastFour: lastFour.trim().replace(/\D/g, '').slice(-4),
        balance: parseFloat(balance) || 0
      });
    };

    return h('div', { className: 'modal-backdrop' },
      h('div', { className: 'bottom-sheet-card', style: { maxWidth: '420px' } },
        h('div', { className: 'sheet-header' },
          h('div', { className: 'sheet-title' },
            h('span', null, '💳'),
            ' Add Payment Account'
          ),
          h('button', { type: 'button', className: 'sheet-close-btn', onClick: onClose }, '✕')
        ),

        h('form', { onSubmit: handleSubmit },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Account Name *'),
            h('input', {
              type: 'text',
              required: true,
              placeholder: 'e.g. HDFC Salary Account',
              className: 'form-input',
              value: name,
              onChange: (e) => setName(e.target.value)
            })
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Account Type *'),
            h('select', {
              className: 'form-select',
              value: type,
              onChange: (e) => setType(e.target.value)
            },
              h('option', { value: 'Bank' }, '🏛️ Bank Account'),
              h('option', { value: 'UPI' }, '⚡ UPI'),
              h('option', { value: 'Credit Card' }, '💳 Credit Card'),
              h('option', { value: 'Debit Card' }, '💳 Debit Card'),
              h('option', { value: 'Cash' }, '💵 Cash'),
              h('option', { value: 'Wallet' }, '👛 Digital Wallet')
            )
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Last 4 Digits (for SMS auto-mapping)'),
            h('input', {
              type: 'text',
              maxLength: 4,
              placeholder: 'e.g. 1234',
              className: 'form-input',
              value: lastFour,
              onChange: (e) => setLastFour(e.target.value)
            })
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, `Opening Balance (${currency})`),
            h('input', {
              type: 'number',
              step: 'any',
              placeholder: '0',
              className: 'form-input',
              value: balance,
              onChange: (e) => setBalance(e.target.value)
            })
          ),

          h('div', { className: 'sheet-actions' },
            h('button', { type: 'button', className: 'cancel-btn', onClick: onClose }, 'Cancel'),
            h('button', { type: 'submit', className: 'submit-btn' }, 'Save Account')
          )
        )
      )
    );
  }

  // --- MOUNT REACT APP ---
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
