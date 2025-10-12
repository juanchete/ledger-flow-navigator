-- ============================================================================
-- VERIFICACIÓN Y CORRECCIÓN DE TRIGGERS DE PAGOS
-- ============================================================================

-- 1. VERIFICAR SI LOS CAMPOS EXISTEN
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('debts', 'receivables')
  AND column_name IN ('amount_usd', 'total_paid_usd', 'remaining_amount_usd', 'exchange_rate')
ORDER BY table_name, column_name;

-- 2. VERIFICAR SI LOS TRIGGERS EXISTEN
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN (
    'trigger_calculate_debt_amount_usd',
    'trigger_calculate_receivable_amount_usd',
    'trigger_update_debt_receivable_payments'
)
ORDER BY trigger_name;

-- 3. VERIFICAR DATOS DE UNA CUENTA POR COBRAR ESPECÍFICA
SELECT
    r.id,
    r.description,
    r.amount as monto_original,
    r.currency,
    r.amount_usd,
    r.total_paid_usd,
    r.remaining_amount_usd,
    r.status,
    (SELECT COUNT(*)
     FROM transactions
     WHERE receivable_id = r.id
       AND type = 'payment'
       AND status = 'completed') as num_pagos,
    (SELECT SUM(amount)
     FROM transactions
     WHERE receivable_id = r.id
       AND type = 'payment'
       AND status = 'completed') as suma_pagos_monto_original
FROM receivables r
WHERE r.description ILIKE '%Compra%Inventario%'
ORDER BY r.created_at DESC
LIMIT 5;

-- 4. VERIFICAR TRANSACCIONES DE PAGO RELACIONADAS
SELECT
    t.id,
    t.type,
    t.amount,
    t.currency,
    t.custom_exchange_rate,
    t.receivable_id,
    t.date,
    t.status,
    r.description as receivable_desc
FROM transactions t
LEFT JOIN receivables r ON t.receivable_id = r.id
WHERE t.receivable_id IN (
    SELECT id FROM receivables
    WHERE description ILIKE '%Compra%Inventario%'
)
ORDER BY t.date DESC;

-- ============================================================================
-- SI LOS CAMPOS NO EXISTEN, EJECUTAR ESTO:
-- ============================================================================

-- Para DEBTS
ALTER TABLE debts ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS total_paid_usd DECIMAL(18,2) DEFAULT 0;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS remaining_amount_usd DECIMAL(18,2);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS exchange_rate_id INTEGER REFERENCES exchange_rates(id);

-- Para RECEIVABLES
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS total_paid_usd DECIMAL(18,2) DEFAULT 0;
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS remaining_amount_usd DECIMAL(18,2);
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6);
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS exchange_rate_id INTEGER REFERENCES exchange_rates(id);

-- ============================================================================
-- RECALCULAR MANUALMENTE LOS TOTALES
-- ============================================================================

-- Para la cuenta por cobrar específica que está dando problemas
DO $$
DECLARE
    rec_id VARCHAR(64);
    total_paid DECIMAL(18,2);
BEGIN
    -- Obtener el ID de la cuenta por cobrar
    SELECT id INTO rec_id
    FROM receivables
    WHERE description ILIKE '%Compra%Inventario%'
    ORDER BY created_at DESC
    LIMIT 1;

    IF rec_id IS NOT NULL THEN
        -- Calcular total pagado en USD
        SELECT COALESCE(SUM(
            CASE
                WHEN t.currency = 'USD' OR t.currency IS NULL THEN t.amount
                WHEN t.currency = 'VES' THEN
                    t.amount / COALESCE(
                        (SELECT rate FROM exchange_rates WHERE id = t.exchange_rate_id),
                        t.custom_exchange_rate,
                        (SELECT rate FROM exchange_rates WHERE date <= DATE(t.date) ORDER BY date DESC LIMIT 1),
                        200.0
                    )
                ELSE t.amount
            END
        ), 0) INTO total_paid
        FROM transactions t
        WHERE t.receivable_id = rec_id
          AND t.type = 'payment'
          AND t.status = 'completed';

        -- Actualizar la cuenta por cobrar
        UPDATE receivables
        SET
            total_paid_usd = total_paid,
            remaining_amount_usd = COALESCE(amount_usd, amount) - total_paid,
            status = CASE
                WHEN (COALESCE(amount_usd, amount) - total_paid) <= 0.01 THEN 'paid'
                ELSE status
            END
        WHERE id = rec_id;

        RAISE NOTICE 'Cuenta por cobrar % actualizada: total_paid_usd=$%, remaining=$%',
            rec_id, total_paid, (COALESCE((SELECT amount_usd FROM receivables WHERE id = rec_id),
                                          (SELECT amount FROM receivables WHERE id = rec_id)) - total_paid);
    END IF;
END $$;

-- ============================================================================
-- RECALCULAR TODAS LAS RECEIVABLES
-- ============================================================================

UPDATE receivables r
SET
    amount_usd = CASE
        WHEN currency = 'USD' OR currency IS NULL THEN amount
        WHEN currency = 'VES' THEN
            amount / COALESCE(
                (SELECT rate FROM exchange_rates WHERE id = r.exchange_rate_id),
                r.exchange_rate,
                (SELECT rate FROM exchange_rates ORDER BY date DESC LIMIT 1),
                200.0
            )
        ELSE amount
    END
WHERE amount_usd IS NULL;

UPDATE receivables r
SET
    total_paid_usd = COALESCE(
        (SELECT SUM(
            CASE
                WHEN t.currency = 'USD' OR t.currency IS NULL THEN t.amount
                WHEN t.currency = 'VES' THEN
                    t.amount / COALESCE(
                        (SELECT rate FROM exchange_rates WHERE id = t.exchange_rate_id),
                        t.custom_exchange_rate,
                        (SELECT rate FROM exchange_rates WHERE date <= DATE(t.date) ORDER BY date DESC LIMIT 1),
                        200.0
                    )
                ELSE t.amount
            END
        )
        FROM transactions t
        WHERE t.receivable_id = r.id
          AND t.type = 'payment'
          AND t.status = 'completed'
    ), 0);

UPDATE receivables
SET remaining_amount_usd = COALESCE(amount_usd, amount) - COALESCE(total_paid_usd, 0);

UPDATE receivables
SET status = 'paid'
WHERE remaining_amount_usd <= 0.01 AND status != 'paid';

-- ============================================================================
-- RECALCULAR TODAS LAS DEBTS
-- ============================================================================

UPDATE debts d
SET
    amount_usd = CASE
        WHEN currency = 'USD' OR currency IS NULL THEN amount
        WHEN currency = 'VES' THEN
            amount / COALESCE(
                (SELECT rate FROM exchange_rates WHERE id = d.exchange_rate_id),
                d.exchange_rate,
                (SELECT rate FROM exchange_rates ORDER BY date DESC LIMIT 1),
                200.0
            )
        ELSE amount
    END
WHERE amount_usd IS NULL;

UPDATE debts d
SET
    total_paid_usd = COALESCE(
        (SELECT SUM(
            CASE
                WHEN t.currency = 'USD' OR t.currency IS NULL THEN t.amount
                WHEN t.currency = 'VES' THEN
                    t.amount / COALESCE(
                        (SELECT rate FROM exchange_rates WHERE id = t.exchange_rate_id),
                        t.custom_exchange_rate,
                        (SELECT rate FROM exchange_rates WHERE date <= DATE(t.date) ORDER BY date DESC LIMIT 1),
                        200.0
                    )
                ELSE t.amount
            END
        )
        FROM transactions t
        WHERE t.debt_id = d.id
          AND t.type = 'payment'
          AND t.status = 'completed'
    ), 0);

UPDATE debts
SET remaining_amount_usd = COALESCE(amount_usd, amount) - COALESCE(total_paid_usd, 0);

UPDATE debts
SET status = 'paid'
WHERE remaining_amount_usd <= 0.01 AND status != 'paid';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

SELECT
    'RECEIVABLES' as tabla,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as pagadas,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendientes
FROM receivables

UNION ALL

SELECT
    'DEBTS' as tabla,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as pagadas,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendientes
FROM debts;

SELECT 'ACTUALIZACIÓN MANUAL COMPLETADA' as status;
