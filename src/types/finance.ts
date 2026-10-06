/**
 * EXPENSE TRACKER — TYPESCRIPT DATA MODELS
 * Mobile-First Personal Finance Tracking Architecture
 */

export type TransactionType = 'INCOME' | 'EXPENSE' | 'FUND_CONTRIBUTION' | 'TRANSFER';

export type PaymentMethodType = 'Cash' | 'UPI' | 'Bank' | 'Debit Card' | 'Credit Card' | 'Other';

export type FundType = 'MONTHLY' | 'WEEKLY' | 'YEARLY' | 'ONE_TIME';

export type FundStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type PaymentStatus = 'PAID' | 'PENDING' | 'UPCOMING';

export interface Category {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  icon: string;
  color: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  isActive: boolean;
}

export type TransactionSource = 'MANUAL' | 'SMS' | 'IMPORT' | 'SYSTEM';

export interface Transaction {
  id: string;
  userId?: string;
  type: TransactionType;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  paymentMethod: string;
  description: string;
  notes?: string;
  source?: TransactionSource;
  smsCandidateId?: string;
  transactionReference?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringStartDate?: string;
  recurringEndDate?: string;
  createdAt: string;
  updatedAt: string;
  pendingSync?: boolean;
}

export interface Fund {
  id: string;
  userId?: string;
  name: string;
  fundType: FundType;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  contributionAmount: number;
  frequency: RecurringFrequency;
  frequencyDay: string; // e.g. "Monday" or "5" or "10-15"
  startDate: string;
  targetDate?: string;
  status: FundStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FundContribution {
  id: string;
  fundId: string;
  userId?: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface MonthlyBudget {
  id?: string;
  month: number; // 1-12
  year: number;
  totalBudget: number;
}

export interface CategoryBudget {
  id?: string;
  categoryId: string;
  month: number;
  year: number;
  limitAmount: number;
}

export interface RecurringPayment {
  id: string;
  userId?: string;
  name: string;
  amount: number;
  categoryId: string;
  frequency: RecurringFrequency;
  dueDay: number; // 1-31
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  isPaidThisCycle: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSyncedAt?: string;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  allocatedFunds: number;
  availableBalance: number; // Income - Expenses - AllocatedFunds
  savings: number; // Income - Expenses
  savingsPercentage: number;
  todaySpending: number;
  todayTxnCount: number;
  monthlyBudget: number;
  budgetUsedPercentage: number;
  budgetRemaining: number;
  highestSpendingDay: string;
  highestCategoryName: string;
  dailyAverageSpend: number;
  totalTxnCount: number;
}

export type SmsDetectionMode = 'OFF' | 'REVIEW_EVERY' | 'AUTO_ADD_HIGH' | 'AUTO_ADD_ALL';

export type SmsCandidateStatus = 'PENDING' | 'APPROVED' | 'IGNORED' | 'DUPLICATE';

export type SmsConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SmsSettings {
  id?: string;
  userId?: string;
  enabled: boolean;
  detectionMode: SmsDetectionMode;
  historicalImportEnabled: boolean;
  notificationsEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmsTransactionCandidate {
  id: string;
  userId?: string;
  fingerprint: string;
  type: TransactionType;
  amount: number;
  merchant: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  paymentMethod?: string;
  transactionDate: string;
  transactionTime: string;
  transactionReference?: string;
  accountSuffix?: string;
  confidence: SmsConfidence;
  status: SmsCandidateStatus;
  source: 'SMS';
  fundTargetId?: string;
  fundTargetName?: string;
  createdAt: string;
  processedAt?: string;
}

export interface SmsCategoryMapping {
  id?: string;
  userId?: string;
  merchantPattern: string;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
}
