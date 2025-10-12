-- Script para verificar capas VES y diagnóstico
-- Ejecutar en Supabase SQL Editor

-- 1. Ver todas las cuentas VES con su saldo
SELECT
    id,
    bank,
    account_number,
    currency,
    amount as balance_ves,
    created_at
FROM public.bank_accounts
WHERE currency = 'VES'
ORDER BY created_at DESC;

-- 2. Ver todas las capas VES existentes
SELECT
    vl.id,
    vl.bank_account_id,
    ba.bank,
    ba.account_number,
    vl.amount_ves as original_amount,
    vl.remaining_ves,
    vl.exchange_rate,
    vl.is_active,
    vl.created_at,
    vl.transaction_id
FROM public.ves_layers vl
LEFT JOIN public.bank_accounts ba ON ba.id = vl.bank_account_id
ORDER BY vl.created_at ASC;

-- 3. Contar capas por cuenta
SELECT
    ba.bank,
    ba.account_number,
    COUNT(vl.id) as total_layers,
    COUNT(CASE WHEN vl.is_active THEN 1 END) as active_layers,
    SUM(vl.remaining_ves) as total_remaining_ves,
    SUM(vl.remaining_ves / NULLIF(vl.exchange_rate, 0)) as total_cost_usd
FROM public.bank_accounts ba
LEFT JOIN public.ves_layers vl ON vl.bank_account_id = ba.id
WHERE ba.currency = 'VES'
GROUP BY ba.id, ba.bank, ba.account_number
ORDER BY ba.bank;

-- 4. Ver transacciones VES que deberían haber creado capas
SELECT
    t.id,
    t.transaction_type,
    t.amount,
    t.currency,
    t.exchange_rate,
    t.description,
    t.to_bank_account_id,
    ba.bank,
    ba.account_number,
    t.created_at
FROM public.transactions t
LEFT JOIN public.bank_accounts ba ON ba.id = t.to_bank_account_id
WHERE t.currency = 'VES'
  AND t.transaction_type IN ('sale', 'cash')
  AND t.to_bank_account_id IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 20;

-- 5. Verificar si existe la función manage_ves_layers
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'manage_ves_layers';

-- 6. Verificar si existe el trigger
SELECT
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'ves_layers_trigger';
