/**
 * SpendFlow — Main Application Logic
 * Comprehensive daily expense tracker & month-end PDF statement system.
 */

(function () {
  'use strict';

  // --- STATE ---
  const state = {
    transactions: [],
    monthlyBudget: 30000,
    currency: '₹',
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(), // 0-indexed (9 = Oct)
    activeCategory: 'Food & Dining',
    activePayment: 'UPI / GPay',
    searchQuery: '',
    filterCategory: 'ALL'
  };

  // --- CATEGORY METADATA ---
  const CATEGORIES = {
    'Food & Dining': { icon: '🍔', color: '#f59e0b' },
    'Groceries': { icon: '🛒', color: '#10b981' },
    'Transport & Fuel': { icon: '🚗', color: '#3b82f6' },
    'Bills & Utilities': { icon: '💡', color: '#ec4899' },
    'Shopping': { icon: '🛍️', color: '#8b5cf6' },
    'Entertainment': { icon: '🎬', color: '#f43f5e' },
    'Health & Medical': { icon: '💊', color: '#06b6d4' },
    'Education & Work': { icon: '📚', color: '#6366f1' },
    'Rent & Living': { icon: '🏠', color: '#d97706' },
    'Other': { icon: '📦', color: '#64748b' }
  };

  // --- LOCALSTORAGE KEYS ---
  const STORAGE_KEYS = {
    TXNS: 'spendflow_transactions_v1',
    BUDGET: 'spendflow_monthly_budget_v1',
    CURRENCY: 'spendflow_currency_v1'
  };

  // --- INITIALIZATION ---
  function init() {
    loadSavedData();
    setupEventListeners();
    setDefaultFormDate();
    registerServiceWorker();
    render();
  }

  // --- STORAGE ---
  function loadSavedData() {
    try {
      const savedTxns = localStorage.getItem(STORAGE_KEYS.TXNS);
      const savedBudget = localStorage.getItem(STORAGE_KEYS.BUDGET);
      const savedCurrency = localStorage.getItem(STORAGE_KEYS.CURRENCY);

      if (savedTxns) {
        state.transactions = JSON.parse(savedTxns);
      } else {
        // Seed initial sample data for rich first impression
        seedSampleData();
      }

      if (savedBudget) state.monthlyBudget = parseFloat(savedBudget) || 30000;
      if (savedCurrency) state.currency = savedCurrency;

      const currencyEl = document.getElementById('currencySelector');
      if (currencyEl) currencyEl.value = state.currency;

      const budgetEl = document.getElementById('settingsDefaultBudget');
      if (budgetEl) budgetEl.value = state.monthlyBudget;
    } catch (e) {
      console.error('Error loading localStorage data:', e);
      state.transactions = [];
    }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEYS.TXNS, JSON.stringify(state.transactions));
    } catch (e) {
      console.error('Error saving transactions:', e);
    }
  }

  function saveBudget(newBudget) {
    state.monthlyBudget = newBudget;
    localStorage.setItem(STORAGE_KEYS.BUDGET, newBudget.toString());
  }

  function saveCurrency(newCurrency) {
    state.currency = newCurrency;
    localStorage.setItem(STORAGE_KEYS.CURRENCY, newCurrency);
  }

  // --- SEED SAMPLE DATA ---
  function seedSampleData() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');

    const sample = [
      { id: 'tx-1', date: `${y}-${m}-01`, amount: 1200, category: 'Groceries', payment: 'Credit Card', note: 'Supermarket weekly essentials', createdAt: Date.now() - 86400000 * 4 },
      { id: 'tx-2', date: `${y}-${m}-02`, amount: 350, category: 'Food & Dining', payment: 'UPI / GPay', note: 'Lunch with colleagues', createdAt: Date.now() - 86400000 * 3 },
      { id: 'tx-3', date: `${y}-${m}-02`, amount: 650, category: 'Transport & Fuel', payment: 'UPI / GPay', note: 'Petrol fill up', createdAt: Date.now() - 86400000 * 3 },
      { id: 'tx-4', date: `${y}-${m}-03`, amount: 2499, category: 'Bills & Utilities', payment: 'Net Banking', note: 'Internet & Electricity', createdAt: Date.now() - 86400000 * 2 },
      { id: 'tx-5', date: `${y}-${m}-04`, amount: 800, category: 'Shopping', payment: 'Debit Card', note: 'Books & Stationery', createdAt: Date.now() - 86400000 },
      { id: 'tx-6', date: `${y}-${m}-05`, amount: 280, category: 'Food & Dining', payment: 'Cash', note: 'Evening snacks & coffee', createdAt: Date.now() }
    ];

    state.transactions = sample;
    saveTransactions();
  }

  // --- FORM HANDLING ---
  function setDefaultFormDate() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateInput = document.getElementById('expDate');
    if (dateInput) dateInput.value = `${y}-${m}-${d}`;

    const pdfMonthInput = document.getElementById('pdfStatementMonth');
    if (pdfMonthInput) pdfMonthInput.value = `${y}-${m}`;
  }

  function setupEventListeners() {
    // Category pill click handler
    const catContainer = document.getElementById('categoryPicker');
    if (catContainer) {
      catContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.cat-pill');
        if (!btn) return;
        catContainer.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeCategory = btn.getAttribute('data-category');
      });
    }

    // Payment pill click handler
    const payContainer = document.getElementById('paymentPicker');
    if (payContainer) {
      payContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.pay-pill');
        if (!btn) return;
        payContainer.querySelectorAll('.pay-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activePayment = btn.getAttribute('data-pay');
      });
    }
  }

  // --- ADD EXPENSE ---
  function handleAddExpense(e) {
    e.preventDefault();

    const date = document.getElementById('expDate').value;
    const amountVal = parseFloat(document.getElementById('expAmount').value);
    const note = document.getElementById('expNote').value.trim();

    if (!date || isNaN(amountVal) || amountVal <= 0) {
      showToast('Please enter a valid date and amount!');
      return;
    }

    const newTxn = {
      id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      date: date,
      amount: Math.round(amountVal * 100) / 100,
      category: state.activeCategory || 'Other',
      payment: state.activePayment || 'UPI / GPay',
      note: note || (CATEGORIES[state.activeCategory]?.icon + ' ' + state.activeCategory),
      createdAt: Date.now()
    };

    state.transactions.unshift(newTxn);
    saveTransactions();

    // Reset amount & note input
    document.getElementById('expAmount').value = '';
    document.getElementById('expNote').value = '';

    // Switch view month to the date of the added expense so user sees it right away
    const [txYear, txMonth] = date.split('-').map(Number);
    state.viewYear = txYear;
    state.viewMonth = txMonth - 1;

    showToast(`Added ${state.currency}${newTxn.amount.toLocaleString()} for ${newTxn.category}!`);
    render();
  }

  function addPresetAmount(val) {
    const amtInput = document.getElementById('expAmount');
    if (!amtInput) return;
    const current = parseFloat(amtInput.value) || 0;
    amtInput.value = (current + val).toString();
  }

  // --- DELETE TRANSACTION ---
  function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveTransactions();
    showToast('Expense entry deleted.');
    render();
  }

  // --- EDIT TRANSACTION ---
  function openEditModal(id) {
    const txn = state.transactions.find(t => t.id === id);
    if (!txn) return;

    document.getElementById('editTxnId').value = txn.id;
    document.getElementById('editDate').value = txn.date;
    document.getElementById('editAmount').value = txn.amount;
    document.getElementById('editCategory').value = txn.category;
    document.getElementById('editPayment').value = txn.payment || 'UPI / GPay';
    document.getElementById('editNote').value = txn.note || '';

    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'flex';
  }

  function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
  }

  function saveEditedExpense(e) {
    e.preventDefault();
    const id = document.getElementById('editTxnId').value;
    const txnIndex = state.transactions.findIndex(t => t.id === id);
    if (txnIndex === -1) return;

    state.transactions[txnIndex] = {
      ...state.transactions[txnIndex],
      date: document.getElementById('editDate').value,
      amount: parseFloat(document.getElementById('editAmount').value) || 0,
      category: document.getElementById('editCategory').value,
      payment: document.getElementById('editPayment').value,
      note: document.getElementById('editNote').value.trim()
    };

    saveTransactions();
    closeEditModal();
    showToast('Expense updated successfully.');
    render();
  }

  // --- MONTH NAVIGATION ---
  function changeMonth(delta) {
    let newMonth = state.viewMonth + delta;
    let newYear = state.viewYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    state.viewYear = newYear;
    state.viewMonth = newMonth;
    render();
  }

  function jumpToCurrentMonth() {
    const today = new Date();
    state.viewYear = today.getFullYear();
    state.viewMonth = today.getMonth();
    render();
  }

  // --- FILTER TRANSACTIONS ---
  function filterTransactions() {
    const searchInput = document.getElementById('txnSearchInput');
    const catSelect = document.getElementById('txnCategoryFilter');

    state.searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    state.filterCategory = catSelect ? catSelect.value : 'ALL';

    renderTransactionsTable();
  }

  // --- MONTH DATA HELPERS ---
  function getViewMonthKey() {
    const m = String(state.viewMonth + 1).padStart(2, '0');
    return `${state.viewYear}-${m}`;
  }

  function getViewMonthLabel() {
    const date = new Date(state.viewYear, state.viewMonth, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function getMonthTransactions() {
    const monthKey = getViewMonthKey();
    return state.transactions.filter(t => t.date && t.date.startsWith(monthKey));
  }

  // --- CALCULATE METRICS ---
  function calculateMetrics() {
    const monthTxns = getMonthTransactions();
    const totalSpent = monthTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTxns = state.transactions.filter(t => t.date === todayStr);
    const todaySpent = todayTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();
    const dailyAvg = (totalSpent / (daysInMonth || 30)).toFixed(0);

    const remainingBudget = state.monthlyBudget - totalSpent;
    const percentSpent = state.monthlyBudget > 0 ? Math.min(100, Math.round((totalSpent / state.monthlyBudget) * 100)) : 0;

    // Remaining daily safe allowance for remaining days in month
    const currentDay = new Date().getDate();
    const remainingDays = Math.max(1, daysInMonth - currentDay + 1);
    const dailyAllowance = remainingBudget > 0 ? (remainingBudget / remainingDays).toFixed(0) : 0;

    // Highest expense day
    const dayTotals = {};
    monthTxns.forEach(t => {
      dayTotals[t.date] = (dayTotals[t.date] || 0) + Number(t.amount);
    });
    let highestDay = '—';
    let highestDayAmt = 0;
    Object.keys(dayTotals).forEach(d => {
      if (dayTotals[d] > highestDayAmt) {
        highestDayAmt = dayTotals[d];
        const dayNum = parseInt(d.split('-')[2], 10);
        highestDay = `${d.split('-')[1]}/${dayNum} (${state.currency}${highestDayAmt.toLocaleString()})`;
      }
    });

    // Top category
    const catTotals = {};
    monthTxns.forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
    });
    let topCat = '—';
    let topCatAmt = 0;
    Object.keys(catTotals).forEach(c => {
      if (catTotals[c] > topCatAmt) {
        topCatAmt = catTotals[c];
        topCat = `${c} (${state.currency}${topCatAmt.toLocaleString()})`;
      }
    });

    return {
      monthTxns,
      totalSpent,
      todaySpent,
      todayCount: todayTxns.length,
      remainingBudget,
      percentSpent,
      dailyAvg,
      dailyAllowance,
      highestDay,
      topCat,
      catTotals
    };
  }

  // --- RENDER MAIN ---
  function render() {
    const metrics = calculateMetrics();
    const monthLabel = getViewMonthLabel();

    // 1. Month displays
    const monthEl = document.getElementById('currentMonthDisplay');
    if (monthEl) monthEl.textContent = monthLabel;

    const subtitleEl = document.getElementById('txnSubtitle');
    if (subtitleEl) subtitleEl.textContent = `Showing records for ${monthLabel}`;

    const pdfPeriodEl = document.getElementById('pdfMockPeriod');
    if (pdfPeriodEl) pdfPeriodEl.textContent = `Month of ${monthLabel}`;

    // 2. Currency prefixes
    document.querySelectorAll('.currency-symbol, .input-currency-prefix').forEach(el => {
      el.textContent = state.currency;
    });

    // 3. Metric cards
    const totalSpentEl = document.getElementById('monthTotalSpent');
    if (totalSpentEl) totalSpentEl.textContent = `${state.currency}${metrics.totalSpent.toLocaleString()}`;

    const txBadge = document.getElementById('txCountBadge');
    if (txBadge) txBadge.textContent = `${metrics.monthTxns.length} TXNs`;

    const budgetDiffEl = document.getElementById('monthBudgetDiff');
    if (budgetDiffEl) {
      budgetDiffEl.textContent = `${metrics.percentSpent}% of budget`;
    }

    const highestDayEl = document.getElementById('highestExpenseDay');
    if (highestDayEl) highestDayEl.textContent = `Highest day: ${metrics.highestDay}`;

    const budgetDisplayEl = document.getElementById('monthBudgetDisplay');
    if (budgetDisplayEl) budgetDisplayEl.textContent = `${state.currency}${state.monthlyBudget.toLocaleString()}`;

    const remainingBudgetEl = document.getElementById('monthRemainingBudget');
    if (remainingBudgetEl) {
      if (metrics.remainingBudget >= 0) {
        remainingBudgetEl.textContent = `${state.currency}${metrics.remainingBudget.toLocaleString()} left`;
        remainingBudgetEl.style.color = '#00f59b';
      } else {
        remainingBudgetEl.textContent = `${state.currency}${Math.abs(metrics.remainingBudget).toLocaleString()} over`;
        remainingBudgetEl.style.color = '#ef4444';
      }
    }

    const fillBar = document.getElementById('budgetProgressFill');
    if (fillBar) {
      fillBar.style.width = `${metrics.percentSpent}%`;
      fillBar.classList.remove('warning', 'danger');
      if (metrics.percentSpent > 90) fillBar.classList.add('danger');
      else if (metrics.percentSpent > 75) fillBar.classList.add('warning');
    }

    const dailyAllowanceEl = document.getElementById('dailyAllowance');
    if (dailyAllowanceEl) {
      dailyAllowanceEl.textContent = `Daily allowance: ${state.currency}${Number(metrics.dailyAllowance).toLocaleString()} / day`;
    }

    const todayExpenseEl = document.getElementById('todayExpenseDisplay');
    if (todayExpenseEl) todayExpenseEl.textContent = `${state.currency}${metrics.todaySpent.toLocaleString()}`;

    const todayHeaderDateEl = document.getElementById('todayHeaderDate');
    if (todayHeaderDateEl) {
      const todayDate = new Date();
      todayHeaderDateEl.textContent = todayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }

    const dailyAvgEl = document.getElementById('dailyAvgDisplay');
    if (dailyAvgEl) dailyAvgEl.textContent = `Avg: ${state.currency}${Number(metrics.dailyAvg).toLocaleString()} / day`;

    const topCatEl = document.getElementById('topCategoryMonth');
    if (topCatEl) topCatEl.textContent = `Top: ${metrics.topCat}`;

    // 4. Tab badge
    const tabCount = document.getElementById('tabTxCount');
    if (tabCount) tabCount.textContent = metrics.monthTxns.length.toString();

    // 5. Sidebar today summary
    const sidebarAmt = document.getElementById('sidebarTodayAmount');
    if (sidebarAmt) sidebarAmt.textContent = `${state.currency}${metrics.todaySpent.toLocaleString()}`;

    const sidebarCount = document.getElementById('sidebarTodayCount');
    if (sidebarCount) sidebarCount.textContent = `${metrics.todayCount} items`;

    renderRecentSidebar(metrics.monthTxns);
    renderTransactionsTable();
    renderCategoryAnalytics(metrics);
    updatePdfPreviewStats();
  }

  // --- RENDER SIDEBAR RECENT ---
  function renderRecentSidebar(monthTxns) {
    const listEl = document.getElementById('recentMiniList');
    if (!listEl) return;

    const recent = monthTxns.slice(0, 5);
    if (recent.length === 0) {
      listEl.innerHTML = `
        <div style="font-size:12px;color:var(--text-dim);text-align:center;padding:16px 0;">
          No expenses logged for this month yet.
        </div>
      `;
      return;
    }

    listEl.innerHTML = recent.map(t => {
      const catMeta = CATEGORIES[t.category] || { icon: '📦' };
      return `
        <div class="mini-txn-item">
          <div class="mini-txn-left">
            <span class="mini-txn-icon">${catMeta.icon}</span>
            <div>
              <div class="mini-txn-title">${escapeHtml(t.note || t.category)}</div>
              <div class="mini-txn-sub">${t.date} · ${t.payment || 'UPI'}</div>
            </div>
          </div>
          <div class="mini-txn-amt">${state.currency}${Number(t.amount).toLocaleString()}</div>
        </div>
      `;
    }).join('');
  }

  // --- RENDER TRANSACTIONS TABLE ---
  function renderTransactionsTable() {
    const tbody = document.getElementById('txnTableBody');
    const emptyState = document.getElementById('txnEmptyState');
    if (!tbody) return;

    let filtered = getMonthTransactions();

    if (state.filterCategory && state.filterCategory !== 'ALL') {
      filtered = filtered.filter(t => t.category === state.filterCategory);
    }

    if (state.searchQuery) {
      filtered = filtered.filter(t => {
        const note = (t.note || '').toLowerCase();
        const cat = (t.category || '').toLowerCase();
        const pay = (t.payment || '').toLowerCase();
        return note.includes(state.searchQuery) || cat.includes(state.searchQuery) || pay.includes(state.searchQuery);
      });
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = filtered.map(t => {
      const catMeta = CATEGORIES[t.category] || { icon: '📦', color: '#64748b' };
      return `
        <tr>
          <td><strong>${t.date}</strong></td>
          <td>
            <span class="cat-badge" style="border-left: 3px solid ${catMeta.color}">
              ${catMeta.icon} ${t.category}
            </span>
          </td>
          <td>${escapeHtml(t.note || '—')}</td>
          <td><span class="pay-badge">${t.payment || 'UPI'}</span></td>
          <td class="amt-cell">${state.currency}${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="text-align: center;">
            <button type="button" class="table-action-btn edit-btn" onclick="SpendApp.openEditModal('${t.id}')" title="Edit Expense">✏️</button>
            <button type="button" class="table-action-btn delete-btn" onclick="SpendApp.deleteTransaction('${t.id}')" title="Delete Expense">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- RENDER CATEGORY ANALYTICS ---
  function renderCategoryAnalytics(metrics) {
    const listEl = document.getElementById('categoryBarsList');
    if (!listEl) return;

    const catTotals = metrics.catTotals;
    const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

    if (sortedCats.length === 0) {
      listEl.innerHTML = `<div style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px;">No category data available for this month.</div>`;
    } else {
      listEl.innerHTML = sortedCats.map(cat => {
        const amt = catTotals[cat];
        const pct = metrics.totalSpent > 0 ? Math.round((amt / metrics.totalSpent) * 100) : 0;
        const meta = CATEGORIES[cat] || { icon: '📦', color: '#00f59b' };

        return `
          <div class="cat-bar-item">
            <div class="cat-bar-header">
              <span>${meta.icon} ${cat}</span>
              <span><b>${state.currency}${amt.toLocaleString()}</b> (${pct}%)</span>
            </div>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" style="width: ${pct}%; background: ${meta.color}"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Payment distribution
    const payListEl = document.getElementById('paymentBarsList');
    if (payListEl) {
      const payTotals = {};
      metrics.monthTxns.forEach(t => {
        const p = t.payment || 'UPI / GPay';
        payTotals[p] = (payTotals[p] || 0) + Number(t.amount);
      });

      const sortedPay = Object.keys(payTotals).sort((a, b) => payTotals[b] - payTotals[a]);
      payListEl.innerHTML = sortedPay.map(p => {
        const amt = payTotals[p];
        const pct = metrics.totalSpent > 0 ? Math.round((amt / metrics.totalSpent) * 100) : 0;
        return `
          <div class="cat-bar-item">
            <div class="cat-bar-header">
              <span>${p}</span>
              <span><b>${state.currency}${amt.toLocaleString()}</b> (${pct}%)</span>
            </div>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" style="width: ${pct}%; background: #38bdf8"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Active spend days stat
    const daysSet = new Set(metrics.monthTxns.map(t => t.date));
    const activeDaysEl = document.getElementById('activeSpendDays');
    if (activeDaysEl) activeDaysEl.textContent = `${daysSet.size} days`;

    const avgActiveEl = document.getElementById('avgPerActiveDay');
    if (avgActiveEl) {
      const avgActive = daysSet.size > 0 ? (metrics.totalSpent / daysSet.size).toFixed(0) : 0;
      avgActiveEl.textContent = `${state.currency}${Number(avgActive).toLocaleString()}`;
    }

    const largestEl = document.getElementById('largestTxnDisplay');
    if (largestEl) {
      const maxAmt = metrics.monthTxns.reduce((max, t) => Math.max(max, Number(t.amount || 0)), 0);
      largestEl.textContent = `${state.currency}${maxAmt.toLocaleString()}`;
    }
  }

  // --- PDF HUB PREVIEW STATS ---
  function updatePdfPreviewStats() {
    const inputMonth = document.getElementById('pdfStatementMonth')?.value || getViewMonthKey();
    const [y, m] = inputMonth.split('-').map(Number);
    const dateObj = new Date(y, m - 1, 1);
    const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const monthTxns = state.transactions.filter(t => t.date && t.date.startsWith(inputMonth));
    const totalSpent = monthTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const variance = state.monthlyBudget - totalSpent;

    const mockPeriod = document.getElementById('pdfMockPeriod');
    if (mockPeriod) mockPeriod.textContent = `Month of ${monthLabel}`;

    const mockTotal = document.getElementById('pdfMockTotal');
    if (mockTotal) mockTotal.textContent = `${state.currency}${totalSpent.toLocaleString()}`;

    const mockBudget = document.getElementById('pdfMockBudget');
    if (mockBudget) mockBudget.textContent = `${state.currency}${state.monthlyBudget.toLocaleString()}`;

    const mockVar = document.getElementById('pdfMockVariance');
    if (mockVar) {
      if (variance >= 0) {
        mockVar.textContent = `${state.currency}${variance.toLocaleString()} under`;
        mockVar.style.color = '#00f59b';
      } else {
        mockVar.textContent = `${state.currency}${Math.abs(variance).toLocaleString()} over`;
        mockVar.style.color = '#ef4444';
      }
    }

    const mockCount = document.getElementById('pdfMockTxnCount');
    if (mockCount) mockCount.textContent = monthTxns.length.toString();
  }

  // --- PDF GENERATION TRIGGER ---
  function generateAndDownloadPdf(autoPrint = false) {
    const inputMonth = document.getElementById('pdfStatementMonth')?.value || getViewMonthKey();
    const [y, m] = inputMonth.split('-').map(Number);
    const dateObj = new Date(y, m - 1, 1);
    const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const monthTxns = state.transactions.filter(t => t.date && t.date.startsWith(inputMonth));
    const totalSpent = monthTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const userName = document.getElementById('pdfUserName')?.value.trim() || 'Personal Expense Statement';
    const currency = document.getElementById('pdfCurrencyCode')?.value || state.currency;
    const includeCategories = document.getElementById('pdfIncludeCategorySummary')?.checked ?? true;
    const includeLedger = document.getElementById('pdfIncludeItemizedList')?.checked ?? true;

    if (monthTxns.length === 0) {
      if (!confirm(`There are no transactions logged for ${monthLabel}. Generate an empty statement anyway?`)) {
        return;
      }
    }

    showToast('Generating official Month-End PDF statement...');

    setTimeout(() => {
      PdfGenerator.generateMonthlyReport({
        monthKey: inputMonth,
        monthLabel: monthLabel,
        transactions: monthTxns,
        totalSpent: totalSpent,
        budget: state.monthlyBudget,
        currency: currency,
        userName: userName,
        includeCategories: includeCategories,
        includeLedger: includeLedger,
        autoPrint: autoPrint
      });
      showToast('PDF Statement generated successfully! 📄');
    }, 150);
  }

  function previewPdfPrint() {
    generateAndDownloadPdf(true);
  }

  // --- TAB NAVIGATION ---
  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- SETTINGS ACTIONS ---
  function setCurrency(newCurr) {
    saveCurrency(newCurr);
    render();
  }

  function saveDefaultBudget() {
    const val = parseFloat(document.getElementById('settingsDefaultBudget').value);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid budget amount.');
      return;
    }
    saveBudget(val);
    showToast(`Monthly budget updated to ${state.currency}${val.toLocaleString()}!`);
    render();
  }

  function openBudgetModal() {
    const current = state.monthlyBudget;
    const input = prompt(`Enter new Monthly Budget Target (${state.currency}):`, current);
    if (input !== null) {
      const num = parseFloat(input);
      if (!isNaN(num) && num > 0) {
        saveBudget(num);
        const budgetInput = document.getElementById('settingsDefaultBudget');
        if (budgetInput) budgetInput.value = num;
        showToast('Budget updated successfully.');
        render();
      }
    }
  }

  function loadSampleData() {
    seedSampleData();
    showToast('Sample expenses loaded successfully! Check Analytics and PDF.');
    render();
  }

  function exportJsonBackup() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      transactions: state.transactions,
      budget: state.monthlyBudget,
      currency: state.currency,
      exportedAt: new Date().toISOString()
    }, null, 2));

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SpendFlow_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON file downloaded.');
  }

  function importJsonBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.transactions && Array.isArray(parsed.transactions)) {
          state.transactions = parsed.transactions;
          if (parsed.budget) state.monthlyBudget = parsed.budget;
          if (parsed.currency) state.currency = parsed.currency;
          saveTransactions();
          saveBudget(state.monthlyBudget);
          saveCurrency(state.currency);
          showToast(`Successfully imported ${state.transactions.length} records!`);
          render();
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    if (confirm('DANGER: This will delete all logged expenses on this device. Are you sure?')) {
      state.transactions = [];
      saveTransactions();
      showToast('All transaction records cleared.');
      render();
    }
  }

  // --- TOAST NOTIFICATION ---
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // --- SERVICE WORKER ---
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then(() => console.log('[SpendFlow] Service Worker registered.'))
        .catch(err => console.log('[SpendFlow] SW registration failed:', err));
    }
  }

  // --- UTILS ---
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- EXPOSE TO WINDOW ---
  window.SpendApp = {
    init,
    handleAddExpense,
    addPresetAmount,
    deleteTransaction,
    openEditModal,
    closeEditModal,
    saveEditedExpense,
    changeMonth,
    jumpToCurrentMonth,
    filterTransactions,
    switchTab,
    setCurrency,
    saveDefaultBudget,
    openBudgetModal,
    loadSampleData,
    exportJsonBackup,
    importJsonBackup,
    clearAllData,
    generateAndDownloadPdf,
    previewPdfPrint,
    updatePdfPreviewStats
  };

  // Launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
