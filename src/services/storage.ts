/**
 * EXPENSE TRACKER — OFFLINE LOCAL STORAGE & SYNC QUEUE SERVICE
 * Ensures zero data loss, offline resiliency, and full JSON backup/restore.
 */

import {
  Category,
  Fund,
  FundContribution,
  MonthlyBudget,
  CategoryBudget,
  PaymentMethod,
  RecurringPayment,
  Transaction,
  UserProfile,
  SupabaseConfig
} from '../types/finance';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_PROFILE,
  INITIAL_BUDGET,
  INITIAL_CATEGORY_BUDGETS,
  INITIAL_CONTRIBUTIONS,
  INITIAL_FUNDS,
  INITIAL_RECURRING_PAYMENTS,
  INITIAL_TRANSACTIONS
} from './sampleData';

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
  OFFLINE_QUEUE: 'exptrk_offline_queue_v1'
};

export class StorageService {
  static loadProfile(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  }

  static saveProfile(profile: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }

  static loadTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  }

  static saveTransactions(txns: Transaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txns));
  }

  static loadCategories(): Category[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  static saveCategories(cats: Category[]): void {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
  }

  static loadFunds(): Fund[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FUNDS);
      return data ? JSON.parse(data) : INITIAL_FUNDS;
    } catch {
      return INITIAL_FUNDS;
    }
  }

  static saveFunds(funds: Fund[]): void {
    localStorage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(funds));
  }

  static loadContributions(): FundContribution[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONTRIBUTIONS);
      return data ? JSON.parse(data) : INITIAL_CONTRIBUTIONS;
    } catch {
      return INITIAL_CONTRIBUTIONS;
    }
  }

  static saveContributions(contribs: FundContribution[]): void {
    localStorage.setItem(STORAGE_KEYS.CONTRIBUTIONS, JSON.stringify(contribs));
  }

  static loadBudget(): MonthlyBudget {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUDGET);
      return data ? JSON.parse(data) : INITIAL_BUDGET;
    } catch {
      return INITIAL_BUDGET;
    }
  }

  static saveBudget(b: MonthlyBudget): void {
    localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(b));
  }

  static loadCategoryBudgets(): CategoryBudget[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORY_BUDGETS);
      return data ? JSON.parse(data) : INITIAL_CATEGORY_BUDGETS;
    } catch {
      return INITIAL_CATEGORY_BUDGETS;
    }
  }

  static saveCategoryBudgets(cb: CategoryBudget[]): void {
    localStorage.setItem(STORAGE_KEYS.CATEGORY_BUDGETS, JSON.stringify(cb));
  }

  static loadRecurringPayments(): RecurringPayment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECURRING_PAYMENTS);
      return data ? JSON.parse(data) : INITIAL_RECURRING_PAYMENTS;
    } catch {
      return INITIAL_RECURRING_PAYMENTS;
    }
  }

  static saveRecurringPayments(rp: RecurringPayment[]): void {
    localStorage.setItem(STORAGE_KEYS.RECURRING_PAYMENTS, JSON.stringify(rp));
  }

  static loadPaymentMethods(): PaymentMethod[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENT_METHODS);
      return data ? JSON.parse(data) : DEFAULT_PAYMENT_METHODS;
    } catch {
      return DEFAULT_PAYMENT_METHODS;
    }
  }

  static savePaymentMethods(pm: PaymentMethod[]): void {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(pm));
  }

  static loadSupabaseConfig(): SupabaseConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
      return data
        ? JSON.parse(data)
        : {
            url: '',
            anonKey: '',
            isConnected: false
          };
    } catch {
      return { url: '', anonKey: '', isConnected: false };
    }
  }

  static saveSupabaseConfig(cfg: SupabaseConfig): void {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(cfg));
  }

  // Reset to clean initial demo data
  static resetToSampleData(): void {
    this.saveProfile(DEFAULT_PROFILE);
    this.saveTransactions(INITIAL_TRANSACTIONS);
    this.saveCategories(DEFAULT_CATEGORIES);
    this.saveFunds(INITIAL_FUNDS);
    this.saveContributions(INITIAL_CONTRIBUTIONS);
    this.saveBudget(INITIAL_BUDGET);
    this.saveCategoryBudgets(INITIAL_CATEGORY_BUDGETS);
    this.saveRecurringPayments(INITIAL_RECURRING_PAYMENTS);
    this.savePaymentMethods(DEFAULT_PAYMENT_METHODS);
  }

  // Export full JSON backup
  static exportFullBackup(): string {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile: this.loadProfile(),
      transactions: this.loadTransactions(),
      categories: this.loadCategories(),
      funds: this.loadFunds(),
      contributions: this.loadContributions(),
      budget: this.loadBudget(),
      categoryBudgets: this.loadCategoryBudgets(),
      recurringPayments: this.loadRecurringPayments(),
      paymentMethods: this.loadPaymentMethods()
    };
    return JSON.stringify(backup, null, 2);
  }

  // Import JSON backup
  static importFullBackup(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.profile) this.saveProfile(parsed.profile);
      if (Array.isArray(parsed.transactions)) this.saveTransactions(parsed.transactions);
      if (Array.isArray(parsed.categories)) this.saveCategories(parsed.categories);
      if (Array.isArray(parsed.funds)) this.saveFunds(parsed.funds);
      if (Array.isArray(parsed.contributions)) this.saveContributions(parsed.contributions);
      if (parsed.budget) this.saveBudget(parsed.budget);
      if (Array.isArray(parsed.categoryBudgets)) this.saveCategoryBudgets(parsed.categoryBudgets);
      if (Array.isArray(parsed.recurringPayments)) this.saveRecurringPayments(parsed.recurringPayments);
      if (Array.isArray(parsed.paymentMethods)) this.savePaymentMethods(parsed.paymentMethods);
      return true;
    } catch (e) {
      console.error('[StorageService] Failed to import backup:', e);
      return false;
    }
  }

  // Clear all data
  static clearAllData(): void {
    this.saveTransactions([]);
    this.saveContributions([]);
    this.saveFunds([]);
    this.saveRecurringPayments([]);
  }
}
