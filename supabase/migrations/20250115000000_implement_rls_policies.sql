-- Migration: Implement comprehensive RLS policies for data isolation
-- Date: 2025-01-15
-- Description: Add user_id columns to tables and implement Row Level Security policies

-- Add user_id column to tables that don't have it
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.exchange_rates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.financial_stats ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.expense_stats ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing records to assign them to the first user (for migration purposes)
-- Note: In production, you should manually assign records to appropriate users
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        UPDATE public.clients SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.bank_accounts SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.debts SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.receivables SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.transactions SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.calendar_events SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.documents SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.exchange_rates SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.financial_stats SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE public.expense_stats SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
END $$;

-- Make user_id NOT NULL after assigning existing records
ALTER TABLE public.clients ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.bank_accounts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.debts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.receivables ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.calendar_events ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.documents ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.exchange_rates ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.financial_stats ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.expense_stats ALTER COLUMN user_id SET NOT NULL;

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can manage their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can view their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can manage their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can view their own receivables" ON public.receivables;
DROP POLICY IF EXISTS "Users can manage their own receivables" ON public.receivables;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Users can manage their own exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Users can view their own financial stats" ON public.financial_stats;
DROP POLICY IF EXISTS "Users can manage their own financial stats" ON public.financial_stats;
DROP POLICY IF EXISTS "Users can view their own expense stats" ON public.expense_stats;
DROP POLICY IF EXISTS "Users can manage their own expense stats" ON public.expense_stats;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user owns the record
CREATE OR REPLACE FUNCTION public.owns_record(record_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN record_user_id = auth.uid() OR public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS TABLE POLICIES
-- Users can only view their own profile (admins can view all)
CREATE POLICY "Users can view own profile or admin can view all"
    ON public.users FOR SELECT
    USING (id = auth.uid() OR public.is_admin());

-- Users can update their own profile (admins can update all)
CREATE POLICY "Users can update own profile or admin can update all"
    ON public.users FOR UPDATE
    USING (id = auth.uid() OR public.is_admin());

-- Only admins can insert new users
CREATE POLICY "Only admins can insert users"
    ON public.users FOR INSERT
    WITH CHECK (public.is_admin());

-- Only admins can delete users
CREATE POLICY "Only admins can delete users"
    ON public.users FOR DELETE
    USING (public.is_admin());

-- CLIENTS TABLE POLICIES
-- Users can only view their own clients
CREATE POLICY "Users can view own clients"
    ON public.clients FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own clients
CREATE POLICY "Users can insert own clients"
    ON public.clients FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own clients"
    ON public.clients FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own clients"
    ON public.clients FOR DELETE
    USING (public.owns_record(user_id));

-- BANK ACCOUNTS TABLE POLICIES
-- Users can only view their own bank accounts
CREATE POLICY "Users can view own bank accounts"
    ON public.bank_accounts FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own bank accounts
CREATE POLICY "Users can insert own bank accounts"
    ON public.bank_accounts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bank accounts"
    ON public.bank_accounts FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own bank accounts"
    ON public.bank_accounts FOR DELETE
    USING (public.owns_record(user_id));

-- DEBTS TABLE POLICIES
-- Users can only view their own debts
CREATE POLICY "Users can view own debts"
    ON public.debts FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own debts
CREATE POLICY "Users can insert own debts"
    ON public.debts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own debts"
    ON public.debts FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own debts"
    ON public.debts FOR DELETE
    USING (public.owns_record(user_id));

-- RECEIVABLES TABLE POLICIES
-- Users can only view their own receivables
CREATE POLICY "Users can view own receivables"
    ON public.receivables FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own receivables
CREATE POLICY "Users can insert own receivables"
    ON public.receivables FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own receivables"
    ON public.receivables FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own receivables"
    ON public.receivables FOR DELETE
    USING (public.owns_record(user_id));

-- TRANSACTIONS TABLE POLICIES
-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own transactions
CREATE POLICY "Users can insert own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions"
    ON public.transactions FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions"
    ON public.transactions FOR DELETE
    USING (public.owns_record(user_id));

-- CALENDAR EVENTS TABLE POLICIES
-- Users can only view their own calendar events
CREATE POLICY "Users can view own calendar events"
    ON public.calendar_events FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own calendar events
CREATE POLICY "Users can insert own calendar events"
    ON public.calendar_events FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar events"
    ON public.calendar_events FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar events"
    ON public.calendar_events FOR DELETE
    USING (public.owns_record(user_id));

-- DOCUMENTS TABLE POLICIES
-- Users can only view their own documents
CREATE POLICY "Users can view own documents"
    ON public.documents FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own documents
CREATE POLICY "Users can insert own documents"
    ON public.documents FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own documents"
    ON public.documents FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own documents"
    ON public.documents FOR DELETE
    USING (public.owns_record(user_id));

-- EXCHANGE RATES TABLE POLICIES
-- Users can view their own exchange rates and global ones
CREATE POLICY "Users can view exchange rates"
    ON public.exchange_rates FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own exchange rates, admins can manage global ones
CREATE POLICY "Users can insert own exchange rates"
    ON public.exchange_rates FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own exchange rates"
    ON public.exchange_rates FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own exchange rates"
    ON public.exchange_rates FOR DELETE
    USING (public.owns_record(user_id));

-- FINANCIAL STATS TABLE POLICIES
-- Users can only view their own financial stats
CREATE POLICY "Users can view own financial stats"
    ON public.financial_stats FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own financial stats
CREATE POLICY "Users can insert own financial stats"
    ON public.financial_stats FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own financial stats"
    ON public.financial_stats FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own financial stats"
    ON public.financial_stats FOR DELETE
    USING (public.owns_record(user_id));

-- EXPENSE STATS TABLE POLICIES
-- Users can only view their own expense stats
CREATE POLICY "Users can view own expense stats"
    ON public.expense_stats FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own expense stats
CREATE POLICY "Users can insert own expense stats"
    ON public.expense_stats FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own expense stats"
    ON public.expense_stats FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own expense stats"
    ON public.expense_stats FOR DELETE
    USING (public.owns_record(user_id));

-- NOTIFICATIONS TABLE POLICIES
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (public.owns_record(user_id));

-- Users can manage their own notifications
CREATE POLICY "Users can insert own notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (public.owns_record(user_id))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    USING (public.owns_record(user_id));

-- Add indexes for better performance with RLS
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_receivables_user_id ON public.receivables(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_user_id ON public.exchange_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_stats_user_id ON public.financial_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_stats_user_id ON public.expense_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically set user_id on insert
CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON public.debts FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON public.exchange_rates FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON public.financial_stats FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON public.expense_stats FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- Update audit tables to include user_id
ALTER TABLE public.debts_audit ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.receivables_audit ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.transactions_audit ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.notifications_audit ADD COLUMN IF NOT EXISTS user_id UUID;

-- Enable RLS on audit tables
ALTER TABLE public.debts_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit tables
CREATE POLICY "Users can view own audit records debts" ON public.debts_audit FOR SELECT USING (public.owns_record(user_id));
CREATE POLICY "Users can view own audit records receivables" ON public.receivables_audit FOR SELECT USING (public.owns_record(user_id));
CREATE POLICY "Users can view own audit records transactions" ON public.transactions_audit FOR SELECT USING (public.owns_record(user_id));
CREATE POLICY "Users can view own audit records notifications" ON public.notifications_audit FOR SELECT USING (public.owns_record(user_id));

-- Only allow inserts for audit records (triggered automatically)
CREATE POLICY "System can insert audit records debts" ON public.debts_audit FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert audit records receivables" ON public.receivables_audit FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert audit records transactions" ON public.transactions_audit FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert audit records notifications" ON public.notifications_audit FOR INSERT WITH CHECK (true);

-- Create a view for admin users to see all data (bypassing RLS)
CREATE OR REPLACE VIEW public.admin_all_data AS
SELECT 
    'clients' as table_name,
    id::text as record_id,
    user_id,
    name as description,
    created_at
FROM public.clients
UNION ALL
SELECT 
    'transactions' as table_name,
    id::text as record_id,
    user_id,
    COALESCE(description, type) as description,
    created_at
FROM public.transactions
UNION ALL
SELECT 
    'debts' as table_name,
    id::text as record_id,
    user_id,
    creditor as description,
    created_at
FROM public.debts
UNION ALL
SELECT 
    'receivables' as table_name,
    id::text as record_id,
    user_id,
    COALESCE(description, 'Receivable') as description,
    created_at
FROM public.receivables;

-- Grant access to admin view only for admin users
CREATE POLICY "Only admins can view admin data"
    ON public.admin_all_data FOR SELECT
    USING (public.is_admin());

COMMENT ON MIGRATION IS 'Implement comprehensive RLS policies for data isolation and user access control'; 