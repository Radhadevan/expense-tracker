/**
 * EXPENSE TRACKER — FINANCIAL CALCULATIONS ENGINE
 * Decimal-safe mathematical calculations adhering strictly to financial logic.
 * Formula: Available Balance = Total Income - Total Expenses - Allocated Funds
 */

import { FundContribution, MonthlyStats, Transaction } from '../types/finance';

export function safeRound(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number, currency: string = '₹'): string {
  const rounded = safeRound(amount);
  const formatted = Math.abs(rounded).toLocaleString('en-IN', {
    maximumFractionDigits: 0
  });
  return `${amount < 0 ? '-' : ''}${currency}${formatted}`;
}

export function calculateMonthlyStats(
  transactions: Transaction[],
  contributions: FundContribution[],
  year: number,
  month: number, // 1-indexed
  monthlyBudgetLimit: number = 25000
): MonthlyStats {
  const targetYearStr = String(year);
  const targetMonthStr = String(month).padStart(2, '0');
  const targetPeriodPrefix = `${targetYearStr}-${targetMonthStr}`;

  const todayStr = new Date().toISOString().split('T')[0];

  let totalIncome = 0;
  let totalExpenses = 0;
  let todaySpending = 0;
  let todayTxnCount = 0;
  let totalTxnCount = 0;

  const dayTotals: Record<string, number> = {};
  const categoryTotals: Record<string, { name: string; amount: number }> = {};

  transactions.forEach((txn) => {
    if (!txn.date) return;

    // Check if within selected month
    if (txn.date.startsWith(targetPeriodPrefix)) {
      totalTxnCount++;

      if (txn.type === 'INCOME') {
        totalIncome += txn.amount;
      } else if (txn.type === 'EXPENSE') {
        totalExpenses += txn.amount;

        // Track daily spending for highest day & daily avg
        dayTotals[txn.date] = (dayTotals[txn.date] || 0) + txn.amount;

        // Track category totals
        const catKey = txn.categoryId || 'cat-other-exp';
        const catName = txn.categoryName || 'Other';
        if (!categoryTotals[catKey]) {
          categoryTotals[catKey] = { name: catName, amount: 0 };
        }
        categoryTotals[catKey].amount += txn.amount;
      }
    }

    // Check today's spending (current day regardless of selected month viewing)
    if (txn.date === todayStr) {
      if (txn.type === 'EXPENSE') {
        todaySpending += txn.amount;
      }
      todayTxnCount++;
    }
  });

  // Calculate allocated funds in the selected month
  let allocatedFunds = 0;
  contributions.forEach((c) => {
    if (c.date && c.date.startsWith(targetPeriodPrefix)) {
      allocatedFunds += c.amount;
    }
  });

  // Safe rounding
  totalIncome = safeRound(totalIncome);
  totalExpenses = safeRound(totalExpenses);
  allocatedFunds = safeRound(allocatedFunds);
  todaySpending = safeRound(todaySpending);

  // Available Balance = Income - Expenses - AllocatedFunds
  const availableBalance = safeRound(totalIncome - totalExpenses - allocatedFunds);

  // Net Savings = Total Income - Total Expenses
  const savings = safeRound(totalIncome - totalExpenses);
  const savingsPercentage = totalIncome > 0 ? safeRound((savings / totalIncome) * 100) : 0;

  // Monthly Budget calculations
  const budgetUsedPercentage = monthlyBudgetLimit > 0 ? safeRound((totalExpenses / monthlyBudgetLimit) * 100) : 0;
  const budgetRemaining = safeRound(Math.max(0, monthlyBudgetLimit - totalExpenses));

  // Highest spending day
  let highestSpendingDay = '—';
  let maxDaySpend = 0;
  Object.entries(dayTotals).forEach(([day, amt]) => {
    if (amt > maxDaySpend) {
      maxDaySpend = amt;
      const d = new Date(day);
      highestSpendingDay = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (₹${amt.toLocaleString()})`;
    }
  });

  // Highest spending category
  let highestCategoryName = 'None';
  let maxCatSpend = 0;
  Object.values(categoryTotals).forEach((c) => {
    if (c.amount > maxCatSpend) {
      maxCatSpend = c.amount;
      highestCategoryName = c.name;
    }
  });

  // Days in month or days passed
  const daysInMonth = new Date(year, month, 0).getDate();
  const currentDay = year === new Date().getFullYear() && month === new Date().getMonth() + 1 ? new Date().getDate() : daysInMonth;
  const dailyAverageSpend = currentDay > 0 ? safeRound(totalExpenses / currentDay) : 0;

  return {
    totalIncome,
    totalExpenses,
    allocatedFunds,
    availableBalance,
    savings,
    savingsPercentage,
    todaySpending,
    todayTxnCount,
    monthlyBudget: monthlyBudgetLimit,
    budgetUsedPercentage,
    budgetRemaining,
    highestSpendingDay,
    highestCategoryName,
    dailyAverageSpend,
    totalTxnCount
  };
}

export function getCategorySpending(transactions: Transaction[], year: number, month: number) {
  const targetPeriodPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const map: Record<string, { id: string; name: string; icon: string; color: string; amount: number; percentage: number }> = {};
  let totalExpense = 0;

  transactions.forEach((txn) => {
    if (txn.type === 'EXPENSE' && txn.date && txn.date.startsWith(targetPeriodPrefix)) {
      totalExpense += txn.amount;
      const catId = txn.categoryId || 'cat-other-exp';
      if (!map[catId]) {
        map[catId] = {
          id: catId,
          name: txn.categoryName || 'Other',
          icon: txn.categoryIcon || '📦',
          color: txn.categoryColor || '#00f59b',
          amount: 0,
          percentage: 0
        };
      }
      map[catId].amount = safeRound(map[catId].amount + txn.amount);
    }
  });

  const list = Object.values(map);
  if (totalExpense > 0) {
    list.forEach((item) => {
      item.percentage = safeRound((item.amount / totalExpense) * 100);
    });
  }

  // Sort descending by amount
  list.sort((a, b) => b.amount - a.amount);
  return { list, totalExpense: safeRound(totalExpense) };
}
