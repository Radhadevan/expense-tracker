/**
 * EXPENSE TRACKER — INITIAL SAMPLE DATA
 * Realistic starter financial data adhering to Section 20 requirements
 */

import { Category, Fund, FundContribution, MonthlyBudget, CategoryBudget, PaymentMethod, RecurringPayment, Transaction, UserProfile } from '../types/finance';

export const DEFAULT_PROFILE: UserProfile = {
  id: 'user-default-1',
  name: 'Radhadevan',
  currency: '₹',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense Categories
  { id: 'cat-food', name: 'Food', type: 'EXPENSE', icon: '🍔', color: '#f59e0b', isDefault: true },
  { id: 'cat-travel', name: 'Petrol / Travel', type: 'EXPENSE', icon: '🚗', color: '#38bdf8', isDefault: true },
  { id: 'cat-rent', name: 'Rent', type: 'EXPENSE', icon: '🏠', color: '#ec4899', isDefault: true },
  { id: 'cat-emi', name: 'EMI', type: 'EXPENSE', icon: '💳', color: '#ef4444', isDefault: true },
  { id: 'cat-bills', name: 'Bills', type: 'EXPENSE', icon: '💡', color: '#a855f7', isDefault: true },
  { id: 'cat-shopping', name: 'Shopping', type: 'EXPENSE', icon: '🛍️', color: '#06b6d4', isDefault: true },
  { id: 'cat-entertainment', name: 'Entertainment', type: 'EXPENSE', icon: '🎬', color: '#f43f5e', isDefault: true },
  { id: 'cat-health', name: 'Health', type: 'EXPENSE', icon: '💊', color: '#14b8a6', isDefault: true },
  { id: 'cat-gym', name: 'Gym', type: 'EXPENSE', icon: '🏋️', color: '#84cc16', isDefault: true },
  { id: 'cat-subscriptions', name: 'Subscriptions', type: 'EXPENSE', icon: '📱', color: '#6366f1', isDefault: true },
  { id: 'cat-education', name: 'Education', type: 'EXPENSE', icon: '📚', color: '#d97706', isDefault: true },
  { id: 'cat-other-exp', name: 'Other', type: 'EXPENSE', icon: '📦', color: '#64748b', isDefault: true },

  // Income Categories
  { id: 'cat-salary', name: 'Salary', type: 'INCOME', icon: '💼', color: '#00f59b', isDefault: true },
  { id: 'cat-incentive', name: 'Incentive', type: 'INCOME', icon: '🎯', color: '#10b981', isDefault: true },
  { id: 'cat-freelance', name: 'Freelance', type: 'INCOME', icon: '💻', color: '#34d399', isDefault: true },
  { id: 'cat-bonus', name: 'Bonus', type: 'INCOME', icon: '🎁', color: '#22c55e', isDefault: true },
  { id: 'cat-other-inc', name: 'Other Income', type: 'INCOME', icon: '💰', color: '#4ade80', isDefault: true }
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm-upi', name: 'UPI', type: 'UPI', isActive: true },
  { id: 'pm-cash', name: 'Cash', type: 'Cash', isActive: true },
  { id: 'pm-bank', name: 'Bank', type: 'Bank', isActive: true },
  { id: 'pm-debit', name: 'Debit Card', type: 'Debit Card', isActive: true },
  { id: 'pm-credit', name: 'Credit Card', type: 'Credit Card', isActive: true },
  { id: 'pm-other', name: 'Other', type: 'Other', isActive: true }
];

// Helper to get formatted dates in current month
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
const pad = (n: number) => String(n).padStart(2, '0');

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-1',
    type: 'INCOME',
    categoryId: 'cat-salary',
    categoryName: 'Salary',
    categoryIcon: '💼',
    categoryColor: '#00f59b',
    amount: 25000,
    date: `${currentYear}-${currentMonth}-01`,
    time: '09:00',
    paymentMethod: 'Bank',
    description: 'Salary',
    notes: 'Monthly employer credit',
    createdAt: `${currentYear}-${currentMonth}-01T09:00:00Z`,
    updatedAt: `${currentYear}-${currentMonth}-01T09:00:00Z`
  },
  {
    id: 'txn-2',
    type: 'EXPENSE',
    categoryId: 'cat-emi',
    categoryName: 'EMI',
    categoryIcon: '💳',
    categoryColor: '#ef4444',
    amount: 6000,
    date: `${currentYear}-${currentMonth}-03`,
    time: '10:30',
    paymentMethod: 'Bank',
    description: 'Bike EMI',
    notes: 'Auto-debit from bank account',
    createdAt: `${currentYear}-${currentMonth}-03T10:30:00Z`,
    updatedAt: `${currentYear}-${currentMonth}-03T10:30:00Z`
  },
  {
    id: 'txn-3',
    type: 'EXPENSE',
    categoryId: 'cat-rent',
    categoryName: 'Rent',
    categoryIcon: '🏠',
    categoryColor: '#ec4899',
    amount: 3000,
    date: `${currentYear}-${currentMonth}-04`,
    time: '11:00',
    paymentMethod: 'UPI',
    description: 'Rent',
    notes: 'Monthly apartment rent transfer',
    createdAt: `${currentYear}-${currentMonth}-04T11:00:00Z`,
    updatedAt: `${currentYear}-${currentMonth}-04T11:00:00Z`
  },
  {
    id: 'txn-4',
    type: 'EXPENSE',
    categoryId: 'cat-gym',
    categoryName: 'Gym',
    categoryIcon: '🏋️',
    categoryColor: '#84cc16',
    amount: 1300,
    date: `${currentYear}-${currentMonth}-05`,
    time: '07:15',
    paymentMethod: 'UPI',
    description: 'Gym',
    notes: 'Monthly gym subscription pass',
    createdAt: `${currentYear}-${currentMonth}-05T07:15:00Z`,
    updatedAt: `${currentYear}-${currentMonth}-05T07:15:00Z`
  },
  {
    id: 'txn-5',
    type: 'EXPENSE',
    categoryId: 'cat-food',
    categoryName: 'Food',
    categoryIcon: '🍔',
    categoryColor: '#f59e0b',
    amount: 3330,
    date: `${currentYear}-${currentMonth}-04`,
    time: '14:00',
    paymentMethod: 'UPI',
    description: 'Dining & Food Outing',
    notes: 'Team lunch and cafe',
    createdAt: `${currentYear}-${currentMonth}-04T14:00:00Z`,
    updatedAt: `${currentYear}-${currentMonth}-04T14:00:00Z`
  },
  {
    id: 'txn-6',
    type: 'EXPENSE',
    categoryId: 'cat-travel',
    categoryName: 'Petrol / Travel',
    categoryIcon: '🚗',
    categoryColor: '#38bdf8',
    amount: 500,
    date: `${currentYear}-${currentMonth}-${pad(now.getDate())}`,
    time: '12:45',
    paymentMethod: 'UPI',
    description: 'Petrol',
    notes: 'Fuel fill-up at Shell',
    createdAt: `${currentYear}-${currentMonth}-${pad(now.getDate())}T12:45:00Z`,
    updatedAt: `${currentYear}-${currentMonth}-${pad(now.getDate())}T12:45:00Z`
  },
  {
    id: 'txn-7',
    type: 'EXPENSE',
    categoryId: 'cat-food',
    categoryName: 'Food',
    categoryIcon: '🍔',
    categoryColor: '#f59e0b',
    amount: 250,
    date: `${currentYear}-${currentMonth}-${pad(now.getDate())}`,
    time: '19:15',
    paymentMethod: 'Cash',
    description: 'Alfaham + Tea',
    notes: 'Evening dinner with friends',
    createdAt: `${currentYear}-${currentMonth}-${pad(now.getDate())}T19:15:00Z`,
    updatedAt: `${currentYear}-${currentMonth}-${pad(now.getDate())}T19:15:00Z`
  },
  {
    id: 'txn-8',
    type: 'EXPENSE',
    categoryId: 'cat-food',
    categoryName: 'Food',
    categoryIcon: '🍔',
    categoryColor: '#f59e0b',
    amount: 120,
    date: `${currentYear}-${currentMonth}-${pad(now.getDate())}`,
    time: '08:30',
    paymentMethod: 'UPI',
    description: 'Puttu with Egg Curry',
    notes: 'Traditional breakfast',
    createdAt: `${currentYear}-${currentMonth}-${pad(now.getDate())}T08:30:00Z`,
    updatedAt: `${currentYear}-${currentMonth}-${pad(now.getDate())}T08:30:00Z`
  }
];

export const INITIAL_FUNDS: Fund[] = [
  {
    id: 'fund-rd',
    name: 'RD',
    fundType: 'MONTHLY',
    icon: '🏦',
    targetAmount: 1000,
    currentAmount: 1000,
    contributionAmount: 1000,
    frequency: 'MONTHLY',
    frequencyDay: '10',
    startDate: `${currentYear}-${currentMonth}-01`,
    status: 'ACTIVE',
    createdAt: `${currentYear}-${currentMonth}-01T00:00:00Z`,
    updatedAt: `${currentYear}-${currentMonth}-01T00:00:00Z`
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
    startDate: `${currentYear}-${currentMonth}-01`,
    status: 'ACTIVE',
    createdAt: `${currentYear}-${currentMonth}-01T00:00:00Z`,
    updatedAt: `${currentYear}-${currentMonth}-01T00:00:00Z`
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
    startDate: `${currentYear}-01-01`,
    status: 'ACTIVE',
    createdAt: `${currentYear}-01-01T00:00:00Z`,
    updatedAt: `${currentYear}-01-01T00:00:00Z`
  }
];

export const INITIAL_CONTRIBUTIONS: FundContribution[] = [
  {
    id: 'contrib-1',
    fundId: 'fund-rd',
    amount: 1000,
    date: `${currentYear}-${currentMonth}-02`,
    notes: 'Monthly RD installment allocation',
    createdAt: `${currentYear}-${currentMonth}-02T10:00:00Z`
  }
];

export const INITIAL_BUDGET: MonthlyBudget = {
  month: now.getMonth() + 1,
  year: currentYear,
  totalBudget: 25000
};

export const INITIAL_CATEGORY_BUDGETS: CategoryBudget[] = [
  { categoryId: 'cat-food', month: now.getMonth() + 1, year: currentYear, limitAmount: 5000 },
  { categoryId: 'cat-travel', month: now.getMonth() + 1, year: currentYear, limitAmount: 5000 },
  { categoryId: 'cat-shopping', month: now.getMonth() + 1, year: currentYear, limitAmount: 2000 },
  { categoryId: 'cat-entertainment', month: now.getMonth() + 1, year: currentYear, limitAmount: 1500 },
  { categoryId: 'cat-gym', month: now.getMonth() + 1, year: currentYear, limitAmount: 1500 },
  { categoryId: 'cat-rent', month: now.getMonth() + 1, year: currentYear, limitAmount: 3000 },
  { categoryId: 'cat-emi', month: now.getMonth() + 1, year: currentYear, limitAmount: 6000 }
];

export const INITIAL_RECURRING_PAYMENTS: RecurringPayment[] = [
  {
    id: 'rec-1',
    name: 'Bike EMI',
    amount: 6000,
    categoryId: 'cat-emi',
    frequency: 'MONTHLY',
    dueDay: 3,
    startDate: `${currentYear}-01-01`,
    status: 'ACTIVE',
    isPaidThisCycle: true,
    createdAt: `${currentYear}-01-01T00:00:00Z`,
    updatedAt: `${currentYear}-01-01T00:00:00Z`
  },
  {
    id: 'rec-2',
    name: 'Rent',
    amount: 3000,
    categoryId: 'cat-rent',
    frequency: 'MONTHLY',
    dueDay: 4,
    startDate: `${currentYear}-01-01`,
    status: 'ACTIVE',
    isPaidThisCycle: true,
    createdAt: `${currentYear}-01-01T00:00:00Z`,
    updatedAt: `${currentYear}-01-01T00:00:00Z`
  },
  {
    id: 'rec-3',
    name: 'Gym',
    amount: 1300,
    categoryId: 'cat-gym',
    frequency: 'MONTHLY',
    dueDay: 5,
    startDate: `${currentYear}-01-01`,
    status: 'ACTIVE',
    isPaidThisCycle: true,
    createdAt: `${currentYear}-01-01T00:00:00Z`,
    updatedAt: `${currentYear}-01-01T00:00:00Z`
  },
  {
    id: 'rec-4',
    name: 'Subscription',
    amount: 500,
    categoryId: 'cat-subscriptions',
    frequency: 'MONTHLY',
    dueDay: 18,
    startDate: `${currentYear}-01-01`,
    status: 'ACTIVE',
    isPaidThisCycle: false,
    createdAt: `${currentYear}-01-01T00:00:00Z`,
    updatedAt: `${currentYear}-01-01T00:00:00Z`
  },
  {
    id: 'rec-5',
    name: 'RD',
    amount: 1000,
    categoryId: 'cat-bills',
    frequency: 'MONTHLY',
    dueDay: 10,
    startDate: `${currentYear}-01-01`,
    status: 'ACTIVE',
    isPaidThisCycle: true,
    createdAt: `${currentYear}-01-01T00:00:00Z`,
    updatedAt: `${currentYear}-01-01T00:00:00Z`
  },
  {
    id: 'rec-6',
    name: 'Home Expenses',
    amount: 500,
    categoryId: 'cat-bills',
    frequency: 'MONTHLY',
    dueDay: 25,
    startDate: `${currentYear}-01-01`,
    status: 'ACTIVE',
    isPaidThisCycle: false,
    createdAt: `${currentYear}-01-01T00:00:00Z`,
    updatedAt: `${currentYear}-01-01T00:00:00Z`
  }
];
