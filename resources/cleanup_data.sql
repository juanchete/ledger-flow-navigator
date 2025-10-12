-- Script de limpieza de datos para Ledger Flow Navigator
-- Este script elimina todas las transacciones, deudas, cuentas por cobrar, eventos y notificaciones
-- Mantiene: usuarios, clientes, cuentas bancarias (con balance en 0), tasas de cambio

-- IMPORTANTE: Este script incluye limpieza de capas VES y campos calculados agregados en la refactorización escalable

-- Comenzar transacción
BEGIN;

-- 1. Limpiar tablas de auditoría (sin dependencias)
TRUNCATE TABLE transactions_audit CASCADE;
TRUNCATE TABLE debts_audit CASCADE;
TRUNCATE TABLE receivables_audit CASCADE;
TRUNCATE TABLE notifications_audit CASCADE;

-- 2. Limpiar notificaciones
TRUNCATE TABLE notifications CASCADE;

-- 3. Limpiar eventos del calendario
TRUNCATE TABLE calendar_events CASCADE;

-- 4. Limpiar documentos
TRUNCATE TABLE documents CASCADE;

-- 5. Limpiar estadísticas (incluyendo financial_stats mejorado)
TRUNCATE TABLE financial_stats CASCADE;
TRUNCATE TABLE expense_stats CASCADE;

-- 6. ⚠️ IMPORTANTE: Limpiar capas VES (se crean automáticamente con transacciones VES)
TRUNCATE TABLE bank_account_ves_layers CASCADE;

-- 7. Limpiar transacciones (esto automáticamente revertirá los balances gracias al trigger)
DELETE FROM transactions;

-- 8. Limpiar deudas (incluye campos total_paid_usd y remaining_amount_usd)
DELETE FROM debts;

-- 9. Limpiar cuentas por cobrar (incluye campos total_paid_usd y remaining_amount_usd)
DELETE FROM receivables;

-- 10. Resetear balances de cuentas bancarias a 0 (incluyendo historical_cost_usd para FIFO)
UPDATE bank_accounts
SET amount = 0,
    historical_cost_usd = 0,
    updated_at = NOW();

-- 10. Limpiar tasas de cambio (opcional - descomentar si quieres eliminarlas)
-- DELETE FROM exchange_rates;

-- Confirmar cambios
COMMIT;

-- Verificar resultados de limpieza
SELECT 'LIMPIEZA COMPLETA - RESULTADOS' as status;

SELECT
    'transactions' as table_name,
    COUNT(*) as record_count
FROM transactions
UNION ALL
SELECT 'debts', COUNT(*) FROM debts
UNION ALL
SELECT 'receivables', COUNT(*) FROM receivables
UNION ALL
SELECT 'bank_account_ves_layers', COUNT(*) FROM bank_account_ves_layers
UNION ALL
SELECT 'calendar_events', COUNT(*) FROM calendar_events
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'financial_stats', COUNT(*) FROM financial_stats
UNION ALL
SELECT 'bank_accounts', COUNT(*) FROM bank_accounts
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'users', COUNT(*) FROM users
ORDER BY table_name;

-- Mostrar balances de cuentas bancarias (deben estar todos en 0)
SELECT
    bank,
    account_number,
    amount,
    currency,
    historical_cost_usd
FROM bank_accounts
ORDER BY bank, account_number;

-- Verificar patrimonio neto (debe estar en 0)
SELECT * FROM get_current_net_worth();
