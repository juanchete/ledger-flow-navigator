-- ============================================================================
-- AGREGAR CAMPOS CALCULADOS Y TRIGGERS PARA DEUDAS Y CUENTAS POR COBRAR
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR CAMPOS CALCULADOS A DEBTS Y RECEIVABLES (SI NO EXISTEN)
-- ============================================================================

-- Para DEBTS
DO $$
BEGIN
    -- amount_usd: Monto original convertido a USD
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='debts' AND column_name='amount_usd') THEN
        ALTER TABLE debts ADD COLUMN amount_usd DECIMAL(18,2);
    END IF;

    -- total_paid_usd: Total pagado en USD
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='debts' AND column_name='total_paid_usd') THEN
        ALTER TABLE debts ADD COLUMN total_paid_usd DECIMAL(18,2) DEFAULT 0;
    END IF;

    -- remaining_amount_usd: Monto restante en USD
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='debts' AND column_name='remaining_amount_usd') THEN
        ALTER TABLE debts ADD COLUMN remaining_amount_usd DECIMAL(18,2);
    END IF;

    -- exchange_rate: Tasa de cambio usada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='debts' AND column_name='exchange_rate') THEN
        ALTER TABLE debts ADD COLUMN exchange_rate DECIMAL(10,6);
    END IF;

    -- exchange_rate_id: Referencia a la tasa
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='debts' AND column_name='exchange_rate_id') THEN
        ALTER TABLE debts ADD COLUMN exchange_rate_id INTEGER REFERENCES exchange_rates(id);
    END IF;
END $$;

-- Para RECEIVABLES
DO $$
BEGIN
    -- amount_usd: Monto original convertido a USD
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='receivables' AND column_name='amount_usd') THEN
        ALTER TABLE receivables ADD COLUMN amount_usd DECIMAL(18,2);
    END IF;

    -- total_paid_usd: Total pagado en USD
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='receivables' AND column_name='total_paid_usd') THEN
        ALTER TABLE receivables ADD COLUMN total_paid_usd DECIMAL(18,2) DEFAULT 0;
    END IF;

    -- remaining_amount_usd: Monto restante en USD
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='receivables' AND column_name='remaining_amount_usd') THEN
        ALTER TABLE receivables ADD COLUMN remaining_amount_usd DECIMAL(18,2);
    END IF;

    -- exchange_rate: Tasa de cambio usada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='receivables' AND column_name='exchange_rate') THEN
        ALTER TABLE receivables ADD COLUMN exchange_rate DECIMAL(10,6);
    END IF;

    -- exchange_rate_id: Referencia a la tasa
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='receivables' AND column_name='exchange_rate_id') THEN
        ALTER TABLE receivables ADD COLUMN exchange_rate_id INTEGER REFERENCES exchange_rates(id);
    END IF;
END $$;

-- ============================================================================
-- 2. FUNCIÓN PARA CALCULAR amount_usd CUANDO SE CREA/ACTUALIZA UNA DEUDA
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_debt_amount_usd()
RETURNS TRIGGER AS $$
DECLARE
    rate_value DECIMAL(10,6);
BEGIN
    -- Si la moneda es USD, amount_usd = amount
    IF NEW.currency = 'USD' OR NEW.currency IS NULL THEN
        NEW.amount_usd := NEW.amount;
        NEW.remaining_amount_usd := NEW.amount - COALESCE(NEW.total_paid_usd, 0);
        RETURN NEW;
    END IF;

    -- Si la moneda es VES, convertir a USD usando la tasa
    IF NEW.currency = 'VES' THEN
        -- Obtener tasa de cambio
        IF NEW.exchange_rate_id IS NOT NULL THEN
            SELECT rate INTO rate_value
            FROM exchange_rates
            WHERE id = NEW.exchange_rate_id;
        ELSIF NEW.exchange_rate IS NOT NULL AND NEW.exchange_rate > 0 THEN
            rate_value := NEW.exchange_rate;
        ELSE
            -- Usar la tasa más reciente
            SELECT rate INTO rate_value
            FROM exchange_rates
            WHERE date <= CURRENT_DATE
            ORDER BY date DESC
            LIMIT 1;
        END IF;

        rate_value := COALESCE(rate_value, 200.0);

        -- Calcular amount_usd
        NEW.amount_usd := NEW.amount / rate_value;
        NEW.exchange_rate := rate_value;
        NEW.remaining_amount_usd := NEW.amount_usd - COALESCE(NEW.total_paid_usd, 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. FUNCIÓN PARA CALCULAR amount_usd CUANDO SE CREA/ACTUALIZA UNA RECEIVABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_receivable_amount_usd()
RETURNS TRIGGER AS $$
DECLARE
    rate_value DECIMAL(10,6);
BEGIN
    -- Si la moneda es USD, amount_usd = amount
    IF NEW.currency = 'USD' OR NEW.currency IS NULL THEN
        NEW.amount_usd := NEW.amount;
        NEW.remaining_amount_usd := NEW.amount - COALESCE(NEW.total_paid_usd, 0);
        RETURN NEW;
    END IF;

    -- Si la moneda es VES, convertir a USD usando la tasa
    IF NEW.currency = 'VES' THEN
        -- Obtener tasa de cambio
        IF NEW.exchange_rate_id IS NOT NULL THEN
            SELECT rate INTO rate_value
            FROM exchange_rates
            WHERE id = NEW.exchange_rate_id;
        ELSIF NEW.exchange_rate IS NOT NULL AND NEW.exchange_rate > 0 THEN
            rate_value := NEW.exchange_rate;
        ELSE
            -- Usar la tasa más reciente
            SELECT rate INTO rate_value
            FROM exchange_rates
            WHERE date <= CURRENT_DATE
            ORDER BY date DESC
            LIMIT 1;
        END IF;

        rate_value := COALESCE(rate_value, 200.0);

        -- Calcular amount_usd
        NEW.amount_usd := NEW.amount / rate_value;
        NEW.exchange_rate := rate_value;
        NEW.remaining_amount_usd := NEW.amount_usd - COALESCE(NEW.total_paid_usd, 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FUNCIÓN PARA ACTUALIZAR TOTAL PAGADO CUANDO SE REGISTRA UN PAGO
-- ============================================================================

CREATE OR REPLACE FUNCTION update_debt_receivable_payments()
RETURNS TRIGGER AS $$
DECLARE
    payment_usd DECIMAL(18,2);
    rate_value DECIMAL(10,6);
BEGIN
    -- Solo procesar transacciones de tipo 'payment' completadas
    IF NEW.type != 'payment' OR NEW.status != 'completed' THEN
        RETURN NEW;
    END IF;

    -- Convertir el pago a USD si es necesario
    IF NEW.currency = 'USD' OR NEW.currency IS NULL THEN
        payment_usd := NEW.amount;
    ELSIF NEW.currency = 'VES' THEN
        -- Obtener tasa de cambio del pago
        IF NEW.exchange_rate_id IS NOT NULL THEN
            SELECT rate INTO rate_value
            FROM exchange_rates
            WHERE id = NEW.exchange_rate_id;
        ELSIF NEW.custom_exchange_rate IS NOT NULL AND NEW.custom_exchange_rate > 0 THEN
            rate_value := NEW.custom_exchange_rate;
        ELSE
            -- Usar la tasa de la fecha del pago
            SELECT rate INTO rate_value
            FROM exchange_rates
            WHERE date <= DATE(NEW.date)
            ORDER BY date DESC
            LIMIT 1;
        END IF;

        rate_value := COALESCE(rate_value, 200.0);
        payment_usd := NEW.amount / rate_value;
    ELSE
        payment_usd := NEW.amount;
    END IF;

    -- ACTUALIZAR DEUDA si debt_id está presente
    IF NEW.debt_id IS NOT NULL THEN
        UPDATE debts
        SET
            total_paid_usd = COALESCE(total_paid_usd, 0) + payment_usd,
            remaining_amount_usd = COALESCE(amount_usd, amount) - (COALESCE(total_paid_usd, 0) + payment_usd),
            status = CASE
                WHEN (COALESCE(amount_usd, amount) - (COALESCE(total_paid_usd, 0) + payment_usd)) <= 0 THEN 'paid'
                ELSE status
            END,
            updated_at = NOW()
        WHERE id = NEW.debt_id;

        RAISE NOTICE 'Deuda % actualizada: +$%.2f USD pagado', NEW.debt_id, payment_usd;
    END IF;

    -- ACTUALIZAR RECEIVABLE si receivable_id está presente
    IF NEW.receivable_id IS NOT NULL THEN
        UPDATE receivables
        SET
            total_paid_usd = COALESCE(total_paid_usd, 0) + payment_usd,
            remaining_amount_usd = COALESCE(amount_usd, amount) - (COALESCE(total_paid_usd, 0) + payment_usd),
            status = CASE
                WHEN (COALESCE(amount_usd, amount) - (COALESCE(total_paid_usd, 0) + payment_usd)) <= 0 THEN 'paid'
                ELSE status
            END,
            updated_at = NOW()
        WHERE id = NEW.receivable_id;

        RAISE NOTICE 'Cuenta por cobrar % actualizada: +$%.2f USD pagado', NEW.receivable_id, payment_usd;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREAR TRIGGERS
-- ============================================================================

-- Trigger para calcular amount_usd en DEBTS
DROP TRIGGER IF EXISTS trigger_calculate_debt_amount_usd ON debts;
CREATE TRIGGER trigger_calculate_debt_amount_usd
    BEFORE INSERT OR UPDATE ON debts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_debt_amount_usd();

-- Trigger para calcular amount_usd en RECEIVABLES
DROP TRIGGER IF EXISTS trigger_calculate_receivable_amount_usd ON receivables;
CREATE TRIGGER trigger_calculate_receivable_amount_usd
    BEFORE INSERT OR UPDATE ON receivables
    FOR EACH ROW
    EXECUTE FUNCTION calculate_receivable_amount_usd();

-- Trigger para actualizar pagos en DEBTS y RECEIVABLES
DROP TRIGGER IF EXISTS trigger_update_debt_receivable_payments ON transactions;
CREATE TRIGGER trigger_update_debt_receivable_payments
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_debt_receivable_payments();

-- ============================================================================
-- 6. INICIALIZAR CAMPOS PARA DATOS EXISTENTES
-- ============================================================================

-- Inicializar debts existentes
UPDATE debts
SET
    amount_usd = CASE
        WHEN currency = 'USD' OR currency IS NULL THEN amount
        WHEN currency = 'VES' THEN
            amount / COALESCE(
                (SELECT rate FROM exchange_rates WHERE id = exchange_rate_id),
                exchange_rate,
                (SELECT rate FROM exchange_rates ORDER BY date DESC LIMIT 1),
                200.0
            )
        ELSE amount
    END,
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
        WHERE t.debt_id = debts.id
          AND t.type = 'payment'
          AND t.status = 'completed'
    ), 0)
WHERE amount_usd IS NULL OR total_paid_usd IS NULL;

-- Calcular remaining_amount_usd para debts
UPDATE debts
SET remaining_amount_usd = COALESCE(amount_usd, amount) - COALESCE(total_paid_usd, 0);

-- Actualizar estado de debts pagadas
UPDATE debts
SET status = 'paid'
WHERE remaining_amount_usd <= 0 AND status != 'paid';

-- Inicializar receivables existentes
UPDATE receivables
SET
    amount_usd = CASE
        WHEN currency = 'USD' OR currency IS NULL THEN amount
        WHEN currency = 'VES' THEN
            amount / COALESCE(
                (SELECT rate FROM exchange_rates WHERE id = exchange_rate_id),
                exchange_rate,
                (SELECT rate FROM exchange_rates ORDER BY date DESC LIMIT 1),
                200.0
            )
        ELSE amount
    END,
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
        WHERE t.receivable_id = receivables.id
          AND t.type = 'payment'
          AND t.status = 'completed'
    ), 0)
WHERE amount_usd IS NULL OR total_paid_usd IS NULL;

-- Calcular remaining_amount_usd para receivables
UPDATE receivables
SET remaining_amount_usd = COALESCE(amount_usd, amount) - COALESCE(total_paid_usd, 0);

-- Actualizar estado de receivables pagadas
UPDATE receivables
SET status = 'paid'
WHERE remaining_amount_usd <= 0 AND status != 'paid';

-- ============================================================================
-- 7. COMENTARIOS
-- ============================================================================

COMMENT ON FUNCTION calculate_debt_amount_usd() IS
'Calcula el monto en USD de una deuda basándose en la moneda y tasa de cambio.
Se ejecuta BEFORE INSERT/UPDATE en la tabla debts.';

COMMENT ON FUNCTION calculate_receivable_amount_usd() IS
'Calcula el monto en USD de una cuenta por cobrar basándose en la moneda y tasa de cambio.
Se ejecuta BEFORE INSERT/UPDATE en la tabla receivables.';

COMMENT ON FUNCTION update_debt_receivable_payments() IS
'Actualiza los campos total_paid_usd y remaining_amount_usd en debts/receivables
cuando se registra un pago (transacción tipo payment completed).
Marca automáticamente como paid cuando remaining_amount_usd <= 0.';

-- ============================================================================
-- FINALIZADO
-- ============================================================================

SELECT 'TRIGGERS PARA PAGOS DE DEUDAS Y RECEIVABLES CREADOS EXITOSAMENTE' as status;
