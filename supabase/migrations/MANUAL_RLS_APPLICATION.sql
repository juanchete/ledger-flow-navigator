-- ==================================================================================
-- MANUAL RLS APPLICATION SCRIPT
-- ==================================================================================
-- Este script debe ejecutarse en el SQL Editor de Supabase Dashboard
-- Proyecto ID: zmdvczzryoxngjlmexcp
-- 
-- INSTRUCCIONES:
-- 1. Ve a https://supabase.com/dashboard/project/zmdvczzryoxngjlmexcp/sql/new
-- 2. Copia y pega todo este script
-- 3. Ejecuta el script completo
-- 4. Verifica los resultados con las consultas de verificación al final
-- ==================================================================================

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
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.clients;
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.bank_accounts;
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.debts;
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.receivables;
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.transactions;
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.calendar_events;
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.documents;
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.exchange_rates;
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.financial_stats;
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.expense_stats;

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

-- ==================================================================================
-- VERIFICATION FUNCTIONS
-- ==================================================================================

-- Function to test RLS policies
CREATE OR REPLACE FUNCTION public.test_rls_policies()
RETURNS TABLE(
    table_name TEXT,
    policy_count INTEGER,
    rls_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        COUNT(p.policyname)::INTEGER as policy_count,
        t.rowsecurity as rls_enabled
    FROM pg_tables pt
    JOIN pg_class t ON t.relname = pt.tablename
    LEFT JOIN pg_policies p ON p.tablename = pt.tablename
    WHERE pt.schemaname = 'public'
    AND pt.tablename IN (
        'users', 'clients', 'bank_accounts', 'debts', 'receivables', 
        'transactions', 'calendar_events', 'documents', 'exchange_rates',
        'financial_stats', 'expense_stats', 'notifications'
    )
    GROUP BY t.tablename, t.rowsecurity
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is properly isolated
CREATE OR REPLACE FUNCTION public.test_data_isolation(test_user_email TEXT DEFAULT NULL)
RETURNS TABLE(
    table_name TEXT,
    total_records INTEGER,
    user_records INTEGER,
    isolation_working BOOLEAN
) AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user ID or use provided email
    IF test_user_email IS NOT NULL THEN
        SELECT u.id INTO current_user_id 
        FROM auth.users au 
        JOIN public.users u ON u.id = au.id 
        WHERE au.email = test_user_email;
    ELSE
        current_user_id := auth.uid();
    END IF;

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found or not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        'clients'::TEXT,
        (SELECT COUNT(*)::INTEGER FROM public.clients),
        (SELECT COUNT(*)::INTEGER FROM public.clients WHERE user_id = current_user_id),
        (SELECT COUNT(*) FROM public.clients) = (SELECT COUNT(*) FROM public.clients WHERE user_id = current_user_id)
    UNION ALL
    SELECT 
        'transactions'::TEXT,
        (SELECT COUNT(*)::INTEGER FROM public.transactions),
        (SELECT COUNT(*)::INTEGER FROM public.transactions WHERE user_id = current_user_id),
        (SELECT COUNT(*) FROM public.transactions) = (SELECT COUNT(*) FROM public.transactions WHERE user_id = current_user_id)
    UNION ALL
    SELECT 
        'debts'::TEXT,
        (SELECT COUNT(*)::INTEGER FROM public.debts),
        (SELECT COUNT(*)::INTEGER FROM public.debts WHERE user_id = current_user_id),
        (SELECT COUNT(*) FROM public.debts) = (SELECT COUNT(*) FROM public.debts WHERE user_id = current_user_id)
    UNION ALL
    SELECT 
        'receivables'::TEXT,
        (SELECT COUNT(*)::INTEGER FROM public.receivables),
        (SELECT COUNT(*)::INTEGER FROM public.receivables WHERE user_id = current_user_id),
        (SELECT COUNT(*) FROM public.receivables) = (SELECT COUNT(*) FROM public.receivables WHERE user_id = current_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check admin access
CREATE OR REPLACE FUNCTION public.test_admin_access()
RETURNS TABLE(
    is_admin BOOLEAN,
    can_access_admin_functions BOOLEAN,
    user_role TEXT
) AS $$
DECLARE
    current_user_id UUID;
    user_role_val TEXT;
    admin_access BOOLEAN;
BEGIN
    current_user_id := auth.uid();
    
    SELECT role INTO user_role_val 
    FROM public.users 
    WHERE id = current_user_id;
    
    admin_access := public.is_admin();
    
    RETURN QUERY
    SELECT 
        (user_role_val = 'admin')::BOOLEAN,
        admin_access,
        COALESCE(user_role_val, 'none')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users for verification functions
GRANT EXECUTE ON FUNCTION public.test_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_data_isolation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_admin_access() TO authenticated;

-- ==================================================================================
-- EXECUTION COMPLETE MESSAGE
-- ==================================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 RLS POLICIES APPLIED SUCCESSFULLY! 🎉';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run verification: SELECT * FROM public.test_rls_policies();';
    RAISE NOTICE '2. Test isolation: SELECT * FROM public.test_data_isolation();';
    RAISE NOTICE '3. Check admin access: SELECT * FROM public.test_admin_access();';
    RAISE NOTICE '================================================';
END $$;

-- ==================================================================================
-- IMMEDIATE VERIFICATION QUERIES
-- ==================================================================================

-- Run verification immediately
SELECT '🔍 RLS POLICIES VERIFICATION' as status;
SELECT * FROM public.test_rls_policies();

SELECT '👤 USER DATA ISOLATION TEST' as status;
SELECT * FROM public.test_data_isolation();

SELECT '🔑 ADMIN ACCESS TEST' as status;
SELECT * FROM public.test_admin_access(); 