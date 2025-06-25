-- RLS Verification Script
-- This script helps verify that Row Level Security policies are working correctly

-- Function to test RLS policies
CREATE OR REPLACE FUNCTION public.test_rls_policies()
RETURNS TABLE(
    table_name TEXT,
    policy_count INTEGER,
    rls_enabled BOOLEAN,
    has_user_id_column BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        COUNT(p.policyname)::INTEGER as policy_count,
        t.rowsecurity as rls_enabled,
        EXISTS(
            SELECT 1 FROM information_schema.columns c 
            WHERE c.table_name = t.tablename 
            AND c.column_name = 'user_id'
            AND c.table_schema = 'public'
        ) as has_user_id_column
    FROM pg_tables pt
    JOIN pg_class t ON t.relname = pt.tablename
    LEFT JOIN pg_policies p ON p.tablename = pt.tablename
    WHERE pt.schemaname = 'public'
    AND pt.tablename IN (
        'users', 'clients', 'bank_accounts', 'debts', 'receivables', 
        'transactions', 'calendar_events', 'documents', 'exchange_rates',
        'financial_stats', 'expense_stats', 'notifications'
    )
    GROUP BY t.table_name, t.rowsecurity, t.relname
    ORDER BY t.table_name;
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

-- Function to list all RLS policies
CREATE OR REPLACE FUNCTION public.list_rls_policies()
RETURNS TABLE(
    table_name TEXT,
    policy_name TEXT,
    policy_command TEXT,
    policy_permissive TEXT,
    policy_roles TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.tablename::TEXT,
        p.policyname::TEXT,
        p.cmd::TEXT,
        p.permissive::TEXT,
        p.roles::TEXT[]
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    ORDER BY p.tablename, p.policyname;
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

-- View to show RLS status for all tables
CREATE OR REPLACE VIEW public.rls_status AS
SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    ARRAY_AGG(p.policyname) FILTER (WHERE p.policyname IS NOT NULL) as policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Grant execute permissions to authenticated users for verification functions
GRANT EXECUTE ON FUNCTION public.test_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_data_isolation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_admin_access() TO authenticated;
GRANT SELECT ON public.rls_status TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION public.test_rls_policies() IS 'Tests if RLS policies are properly configured for all tables';
COMMENT ON FUNCTION public.test_data_isolation(TEXT) IS 'Tests if data isolation is working correctly for current user';
COMMENT ON FUNCTION public.list_rls_policies() IS 'Lists all RLS policies in the database';
COMMENT ON FUNCTION public.test_admin_access() IS 'Tests admin access and permissions';
COMMENT ON VIEW public.rls_status IS 'Shows RLS status for all tables in the public schema'; 