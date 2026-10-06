-- ==============================================================================
-- EXPENSE TRACKER — SUPABASE DATABASE SCHEMA
-- Standalone, Mobile-First Personal Finance Tracking Application
-- Includes complete normalized tables, Row Level Security (RLS) policies & indexes
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null default 'Radhadevan',
  currency text not null default '₹',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CATEGORIES
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('EXPENSE', 'INCOME')),
  icon text not null default '📦',
  color text not null default '#00f59b',
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. PAYMENT METHODS
create table if not exists public.payment_methods (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null default 'OTHER',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TRANSACTIONS
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('INCOME', 'EXPENSE', 'FUND_CONTRIBUTION', 'TRANSFER')),
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null default current_date,
  time time not null default current_time,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  description text not null,
  notes text,
  is_recurring boolean default false,
  recurring_rule_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. FUNDS (Savings, RD, Emergency Funds)
create table if not exists public.funds (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  fund_type text not null check (fund_type in ('MONTHLY', 'WEEKLY', 'YEARLY', 'ONE_TIME')),
  icon text not null default '🏦',
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  contribution_amount numeric(12, 2) not null default 0,
  frequency text not null default 'MONTHLY',
  frequency_day text default '1',
  start_date date default current_date,
  target_date date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'COMPLETED')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. FUND CONTRIBUTIONS
create table if not exists public.fund_contributions (
  id uuid primary key default uuid_generate_v4(),
  fund_id uuid references public.funds(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null default current_date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. BUDGETS (Monthly overall target)
create table if not exists public.budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month integer not null check (month between 1 and 12),
  year integer not null,
  total_budget numeric(12, 2) not null check (total_budget >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, month, year)
);

-- 8. CATEGORY BUDGETS (Category specific limits)
create table if not exists public.category_budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  month integer not null check (month between 1 and 12),
  year integer not null,
  limit_amount numeric(12, 2) not null check (limit_amount > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, category_id, month, year)
);

-- 9. RECURRING PAYMENTS (Fixed obligations: EMI, Rent, Gym, Subscriptions)
create table if not exists public.recurring_payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  frequency text not null default 'MONTHLY',
  due_day integer not null check (due_day between 1 and 31),
  start_date date default current_date,
  end_date date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'COMPLETED')),
  is_paid_this_cycle boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================

create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);
create index if not exists idx_transactions_user_type on public.transactions(user_id, type);
create index if not exists idx_categories_user on public.categories(user_id, type);
create index if not exists idx_funds_user on public.funds(user_id, status);
create index if not exists idx_fund_contributions_user on public.fund_contributions(user_id, fund_id);
create index if not exists idx_budgets_user_period on public.budgets(user_id, year, month);
create index if not exists idx_category_budgets_user on public.category_budgets(user_id, year, month);
create index if not exists idx_recurring_payments_user on public.recurring_payments(user_id, status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — 100% USER ISOLATION
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.funds enable row level security;
alter table public.fund_contributions enable row level security;
alter table public.budgets enable row level security;
alter table public.category_budgets enable row level security;
alter table public.recurring_payments enable row level security;

-- Profiles Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);

-- Categories Policies
create policy "Users can view own categories" on public.categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on public.categories for update using (auth.uid() = user_id);
create policy "Users can delete own categories" on public.categories for delete using (auth.uid() = user_id);

-- Payment Methods Policies
create policy "Users can view own payment methods" on public.payment_methods for select using (auth.uid() = user_id);
create policy "Users can insert own payment methods" on public.payment_methods for insert with check (auth.uid() = user_id);
create policy "Users can update own payment methods" on public.payment_methods for update using (auth.uid() = user_id);
create policy "Users can delete own payment methods" on public.payment_methods for delete using (auth.uid() = user_id);

-- Transactions Policies
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- Funds Policies
create policy "Users can view own funds" on public.funds for select using (auth.uid() = user_id);
create policy "Users can insert own funds" on public.funds for insert with check (auth.uid() = user_id);
create policy "Users can update own funds" on public.funds for update using (auth.uid() = user_id);
create policy "Users can delete own funds" on public.funds for delete using (auth.uid() = user_id);

-- Fund Contributions Policies
create policy "Users can view own fund contributions" on public.fund_contributions for select using (auth.uid() = user_id);
create policy "Users can insert own fund contributions" on public.fund_contributions for insert with check (auth.uid() = user_id);
create policy "Users can update own fund contributions" on public.fund_contributions for update using (auth.uid() = user_id);
create policy "Users can delete own fund contributions" on public.fund_contributions for delete using (auth.uid() = user_id);

-- Budgets Policies
create policy "Users can view own budgets" on public.budgets for select using (auth.uid() = user_id);
create policy "Users can insert own budgets" on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets" on public.budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets" on public.budgets for delete using (auth.uid() = user_id);

-- Category Budgets Policies
create policy "Users can view own category budgets" on public.category_budgets for select using (auth.uid() = user_id);
create policy "Users can insert own category budgets" on public.category_budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own category budgets" on public.category_budgets for update using (auth.uid() = user_id);
create policy "Users can delete own category budgets" on public.category_budgets for delete using (auth.uid() = user_id);

-- Recurring Payments Policies
create policy "Users can view own recurring payments" on public.recurring_payments for select using (auth.uid() = user_id);
create policy "Users can insert own recurring payments" on public.recurring_payments for insert with check (auth.uid() = user_id);
create policy "Users can update own recurring payments" on public.recurring_payments for update using (auth.uid() = user_id);
create policy "Users can delete own recurring payments" on public.recurring_payments for delete using (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC UPDATED_AT TRIGGER
-- ==============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger on_transactions_updated before update on public.transactions for each row execute procedure public.handle_updated_at();
create trigger on_funds_updated before update on public.funds for each row execute procedure public.handle_updated_at();
create trigger on_budgets_updated before update on public.budgets for each row execute procedure public.handle_updated_at();
create trigger on_category_budgets_updated before update on public.category_budgets for each row execute procedure public.handle_updated_at();
create trigger on_recurring_payments_updated before update on public.recurring_payments for each row execute procedure public.handle_updated_at();

-- ==============================================================================
-- 10. SMS AUTO-TRACKING TABLES & TRANSACTIONS EXTENSIONS
-- ==============================================================================

-- 10.1 Extend Transactions Table
alter table public.transactions add column if not exists source text not null default 'MANUAL' check (source in ('MANUAL', 'SMS', 'IMPORT', 'SYSTEM'));
alter table public.transactions add column if not exists transaction_reference text;
alter table public.transactions add column if not exists sms_candidate_id uuid;

-- 10.2 SMS Settings
create table if not exists public.sms_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  enabled boolean default false,
  detection_mode text not null default 'REVIEW_EVERY' check (detection_mode in ('OFF', 'REVIEW_EVERY', 'AUTO_ADD_HIGH', 'AUTO_ADD_ALL')),
  historical_import_enabled boolean default false,
  notifications_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10.3 SMS Sources (Configured Bank, UPI & Wallet Send Senders)
create table if not exists public.sms_sources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sender_identifier text not null,
  source_name text not null,
  source_type text not null default 'BANK' check (source_type in ('BANK', 'UPI', 'CARD', 'WALLET', 'OTHER')),
  is_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10.4 SMS Transaction Candidates (Pending, Approved, Ignored or Duplicate)
create table if not exists public.sms_transaction_candidates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  fingerprint text not null,
  transaction_type text not null check (transaction_type in ('INCOME', 'EXPENSE', 'FUND_CONTRIBUTION', 'TRANSFER', 'REFUND')),
  amount numeric(12, 2) not null check (amount > 0),
  merchant text not null default 'Unknown',
  category_id uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  transaction_date date not null default current_date,
  transaction_time time not null default current_time,
  transaction_reference text,
  account_suffix text,
  confidence text not null default 'MEDIUM' check (confidence in ('HIGH', 'MEDIUM', 'LOW')),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'IGNORED', 'DUPLICATE')),
  source text not null default 'SMS',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  processed_at timestamp with time zone
);

-- 10.5 SMS Category Learning Mappings (User Merchant Corrections)
create table if not exists public.sms_category_mappings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  merchant_pattern text not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, merchant_pattern)
);

-- Foreign key link back from transactions to sms candidate
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_transactions_sms_candidate') then
    alter table public.transactions add constraint fk_transactions_sms_candidate foreign key (sms_candidate_id) references public.sms_transaction_candidates(id) on delete set null;
  end if;
end $$;

-- Indexes for SMS features
create index if not exists idx_sms_settings_user on public.sms_settings(user_id);
create index if not exists idx_sms_sources_user on public.sms_sources(user_id);
create index if not exists idx_sms_candidates_user_status on public.sms_transaction_candidates(user_id, status);
create index if not exists idx_sms_candidates_fingerprint on public.sms_transaction_candidates(user_id, fingerprint);
create index if not exists idx_sms_candidates_reference on public.sms_transaction_candidates(user_id, transaction_reference);
create index if not exists idx_sms_mappings_user on public.sms_category_mappings(user_id);
create index if not exists idx_transactions_reference on public.transactions(user_id, transaction_reference);
create index if not exists idx_transactions_source on public.transactions(user_id, source);

-- RLS Enablement
alter table public.sms_settings enable row level security;
alter table public.sms_sources enable row level security;
alter table public.sms_transaction_candidates enable row level security;
alter table public.sms_category_mappings enable row level security;

-- SMS Settings Policies
create policy "Users can view own sms settings" on public.sms_settings for select using (auth.uid() = user_id);
create policy "Users can insert own sms settings" on public.sms_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own sms settings" on public.sms_settings for update using (auth.uid() = user_id);
create policy "Users can delete own sms settings" on public.sms_settings for delete using (auth.uid() = user_id);

-- SMS Sources Policies
create policy "Users can view own sms sources" on public.sms_sources for select using (auth.uid() = user_id);
create policy "Users can insert own sms sources" on public.sms_sources for insert with check (auth.uid() = user_id);
create policy "Users can update own sms sources" on public.sms_sources for update using (auth.uid() = user_id);
create policy "Users can delete own sms sources" on public.sms_sources for delete using (auth.uid() = user_id);

-- SMS Candidates Policies
create policy "Users can view own sms candidates" on public.sms_transaction_candidates for select using (auth.uid() = user_id);
create policy "Users can insert own sms candidates" on public.sms_transaction_candidates for insert with check (auth.uid() = user_id);
create policy "Users can update own sms candidates" on public.sms_transaction_candidates for update using (auth.uid() = user_id);
create policy "Users can delete own sms candidates" on public.sms_transaction_candidates for delete using (auth.uid() = user_id);

-- SMS Category Mappings Policies
create policy "Users can view own category mappings" on public.sms_category_mappings for select using (auth.uid() = user_id);
create policy "Users can insert own category mappings" on public.sms_category_mappings for insert with check (auth.uid() = user_id);
create policy "Users can update own category mappings" on public.sms_category_mappings for update using (auth.uid() = user_id);
create policy "Users can delete own category mappings" on public.sms_category_mappings for delete using (auth.uid() = user_id);

-- Triggers
create trigger on_sms_settings_updated before update on public.sms_settings for each row execute procedure public.handle_updated_at();
create trigger on_sms_sources_updated before update on public.sms_sources for each row execute procedure public.handle_updated_at();
create trigger on_sms_category_mappings_updated before update on public.sms_category_mappings for each row execute procedure public.handle_updated_at();

