/**
 * EXPENSE TRACKER — SUPABASE CLOUD DATABASE CLIENT & SYNC SERVICE
 * Provides secure Row Level Security (RLS) cloud sync with offline fallback.
 */

import { SupabaseConfig, Transaction, Fund, FundContribution } from '../types/finance';
import { StorageService } from './storage';

// Declare Supabase UMD global interface if loaded via script tag
declare global {
  interface Window {
    supabase?: {
      createClient: (url: string, key: string) => any;
    };
  }
}

let supabaseInstance: any = null;

export class SupabaseService {
  static getClient() {
    if (supabaseInstance) return supabaseInstance;

    const config = StorageService.loadSupabaseConfig();
    if (config.url && config.anonKey && window.supabase) {
      try {
        supabaseInstance = window.supabase.createClient(config.url, config.anonKey);
        return supabaseInstance;
      } catch (err) {
        console.error('[SupabaseService] Failed to initialize client:', err);
      }
    }
    return null;
  }

  static async testConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    if (!url || !anonKey) {
      return { success: false, message: 'Supabase URL and Anon Key are required.' };
    }

    if (!window.supabase) {
      return { success: false, message: 'Supabase client library not loaded in browser.' };
    }

    try {
      const testClient = window.supabase.createClient(url, anonKey);
      // Query profiles or categories to test connection
      const { data, error } = await testClient.from('categories').select('count', { count: 'exact', head: true });

      if (error && error.code !== 'PGRST116') {
        // If error is table doesn't exist yet, we still know the API key is valid
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          return {
            success: true,
            message: 'Connected to Supabase! (Note: run supabase-schema.sql in SQL editor to create tables).'
          };
        }
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Connected to Supabase successfully!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection failed. Check network/URL.' };
    }
  }

  static async syncWithCloud(userId?: string): Promise<{ synced: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { synced: false, count: 0, error: 'Supabase not configured or offline mode active.' };
    }

    try {
      // 1. Fetch cloud transactions
      let query = client.from('transactions').select('*').order('date', { ascending: false });
      if (userId) query = query.eq('user_id', userId);

      const { data: cloudTxns, error } = await query;
      if (error) throw error;

      if (cloudTxns && cloudTxns.length > 0) {
        // Merge with local transactions (avoid duplicates by ID)
        const localTxns = StorageService.loadTransactions();
        const map = new Map<string, Transaction>();
        localTxns.forEach((t) => map.set(t.id, t));

        cloudTxns.forEach((ct: any) => {
          map.set(ct.id, {
            id: ct.id,
            userId: ct.user_id,
            type: ct.type,
            categoryId: ct.category_id,
            amount: parseFloat(ct.amount),
            date: ct.date,
            time: ct.time,
            paymentMethod: ct.payment_method_id || 'UPI',
            description: ct.description,
            notes: ct.notes,
            isRecurring: ct.is_recurring,
            createdAt: ct.created_at,
            updatedAt: ct.updated_at
          });
        });

        const merged = Array.from(map.values()).sort((a, b) => (b.date > a.date ? 1 : -1));
        StorageService.saveTransactions(merged);

        // Update config last synced time
        const cfg = StorageService.loadSupabaseConfig();
        cfg.lastSyncedAt = new Date().toISOString();
        StorageService.saveSupabaseConfig(cfg);

        return { synced: true, count: cloudTxns.length };
      }

      return { synced: true, count: 0 };
    } catch (err: any) {
      console.warn('[SupabaseService] Cloud sync error:', err);
      return { synced: false, count: 0, error: err.message };
    }
  }

  static async pushTransaction(txn: Transaction, userId?: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload: any = {
        id: txn.id,
        type: txn.type,
        category_id: txn.categoryId,
        amount: txn.amount,
        date: txn.date,
        time: txn.time || '12:00',
        description: txn.description,
        notes: txn.notes || '',
        is_recurring: txn.isRecurring || false
      };
      if (userId) payload.user_id = userId;

      const { error } = await client.from('transactions').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }
}
