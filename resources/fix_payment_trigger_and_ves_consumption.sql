-- ============================================================================
-- CORREGIR TRIGGER DE PAGOS Y AGREGAR CONSUMO DE CAPAS VES FIFO
-- ============================================================================

-- ============================================================================
-- 1. FUNCIÓN PARA CONSUMIR CAPAS VES FIFO
-- ============================================================================

CREATE OR REPLACE FUNCTION consume_ves_layers_fifo(
    p_bank_account_id VARCHAR(64),
    p_amount_ves DECIMAL(18,2)
)
RETURNS TABLE(
    consumed_usd DECIMAL(18,2),
    layers_consumed INTEGER
) AS $$
DECLARE
    remaining_to_consume DECIMAL(18,2) := p_amount_ves;
    layer_record RECORD;
    consumed_from_layer DECIMAL(18,2);
    total_consumed_usd DECIMAL(18,2) := 0;
    layers_count INTEGER := 0;
BEGIN
    -- Consumir capas FIFO (primero las más antiguas = menor tasa)
    FOR layer_record IN
        SELECT id, remaining_ves, exchange_rate
        FROM public.bank_account_ves_layers
        WHERE bank_account_id = p_bank_account_id
          AND is_active = true
          AND remaining_ves > 0
        ORDER BY created_at ASC  -- FIFO: primero las más antiguas
    LOOP
        EXIT WHEN remaining_to_consume <= 0;

        -- Calcular cuánto consumir de esta capa
        consumed_from_layer := LEAST(remaining_to_consume, layer_record.remaining_ves);

        -- Actualizar la capa
        UPDATE public.bank_account_ves_layers
        SET
            remaining_ves = remaining_ves - consumed_from_layer,
            updated_at = NOW()
        WHERE id = layer_record.id;

        -- Calcular el costo USD de lo consumido
        total_consumed_usd := total_consumed_usd + (consumed_from_layer / layer_record.exchange_rate);

        -- Actualizar contador
        remaining_to_consume := remaining_to_consume - consumed_from_layer;
        layers_count := layers_count + 1;

        RAISE NOTICE 'Capa % consumida: %.2f VES (de %.2f) @ tasa %.2f = $%.2f USD',
            layer_record.id, consumed_from_layer, layer_record.remaining_ves,
            layer_record.exchange_rate, (consumed_from_layer / layer_record.exchange_rate);
    END LOOP;

    -- Actualizar historical_cost_usd de la cuenta
    UPDATE public.bank_accounts
    SET historical_cost_usd = (
        SELECT COALESCE(SUM(remaining_ves / NULLIF(exchange_rate, 0)), 0)
        FROM public.bank_account_ves_layers
        WHERE bank_account_id = p_bank_account_id
          AND is_active = true
          AND remaining_ves > 0
    )
    WHERE id = p_bank_account_id;

    RETURN QUERY SELECT total_consumed_usd, layers_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION consume_ves_layers_fifo IS
'Consume capas VES usando método FIFO (First In First Out).
Primero consume las capas más antiguas (con menor tasa de cambio).
Actualiza remaining_ves de cada capa y recalcula historical_cost_usd de la cuenta.';

-- ============================================================================
-- 2. FUNCIÓN PARA CREAR CAPAS VES CUANDO INGRESA DINERO
-- ============================================================================

CREATE OR REPLACE FUNCTION create_ves_layer(
    p_transaction_id VARCHAR(64),
    p_bank_account_id VARCHAR(64),
    p_amount_ves DECIMAL(18,2),
    p_exchange_rate DECIMAL(10,6),
    p_user_id UUID
)
RETURNS VARCHAR(64) AS $$
DECLARE
    new_layer_id VARCHAR(64);
BEGIN
    -- Generar ID para la nueva capa
    new_layer_id := gen_random_uuid()::text;

    -- Crear la capa
    INSERT INTO public.bank_account_ves_layers (
        id,
        bank_account_id,
        transaction_id,
        amount_ves,
        remaining_ves,
        exchange_rate,
        equivalent_usd,
        is_active,
        created_at,
        updated_at,
        user_id
    ) VALUES (
        new_layer_id,
        p_bank_account_id,
        p_transaction_id,
        p_amount_ves,
        p_amount_ves,  -- Al crear, remaining = amount
        p_exchange_rate,
        p_amount_ves / p_exchange_rate,
        true,
        NOW(),
        NOW(),
        p_user_id
    );

    -- Actualizar historical_cost_usd de la cuenta
    UPDATE public.bank_accounts
    SET historical_cost_usd = (
        SELECT COALESCE(SUM(remaining_ves / NULLIF(exchange_rate, 0)), 0)
        FROM public.bank_account_ves_layers
        WHERE bank_account_id = p_bank_account_id
          AND is_active = true
          AND remaining_ves > 0
    )
    WHERE id = p_bank_account_id;

    RAISE NOTICE 'Capa VES creada: % para cuenta % - %.2f VES @ tasa %.2f',
        new_layer_id, p_bank_account_id, p_amount_ves, p_exchange_rate;

    RETURN new_layer_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_ves_layer IS
'Crea una nueva capa VES cuando ingresa dinero a una cuenta VES.
Actualiza el historical_cost_usd de la cuenta automáticamente.';

-- ============================================================================
-- 3. TRIGGER MEJORADO PARA ACTUALIZAR SALDOS Y CAPAS VES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(18,2) := 0;
    account_currency VARCHAR(3);
    layer_result RECORD;
    exchange_rate_value DECIMAL(10,6);
BEGIN
    -- Manejar INSERT (nueva transacción)
    IF TG_OP = 'INSERT' THEN
        -- Manejo especial para balance-change (transferencia entre cuentas propias)
        IF NEW.type = 'balance-change' AND NEW.bank_account_id IS NOT NULL AND NEW.destination_bank_account_id IS NOT NULL THEN
            -- Descontar de la cuenta origen
            UPDATE bank_accounts
            SET amount = amount - NEW.amount
            WHERE id = NEW.bank_account_id;

            -- Sumar a la cuenta destino
            UPDATE bank_accounts
            SET amount = amount + NEW.amount
            WHERE id = NEW.destination_bank_account_id;

            RAISE NOTICE 'Balance-change: Descontado % de cuenta % y sumado a cuenta %',
                NEW.amount, NEW.bank_account_id, NEW.destination_bank_account_id;

        -- Manejo normal para otros tipos de transacciones
        ELSIF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL AND NEW.type != 'balance-change' THEN

            -- Obtener moneda de la cuenta
            SELECT currency INTO account_currency
            FROM bank_accounts
            WHERE id = NEW.bank_account_id;

            -- Determinar el cambio de saldo basado en el tipo de transacción
            CASE NEW.type
                -- INGRESOS: Suman al saldo
                WHEN 'sale', 'cash' THEN
                    balance_change := NEW.amount;

                    -- Si es VES y es ingreso, crear capa FIFO
                    IF account_currency = 'VES' AND NEW.amount > 0 THEN
                        -- Obtener tasa de cambio
                        IF NEW.exchange_rate_id IS NOT NULL THEN
                            SELECT rate INTO exchange_rate_value
                            FROM exchange_rates
                            WHERE id = NEW.exchange_rate_id;
                        END IF;

                        exchange_rate_value := COALESCE(exchange_rate_value, 200.0);

                        -- Crear nueva capa VES
                        PERFORM create_ves_layer(
                            NEW.id,
                            NEW.bank_account_id,
                            NEW.amount,
                            exchange_rate_value,
                            NEW.user_id
                        );
                    END IF;

                -- PAYMENT: Depende si es ingreso (receivable) o egreso (debt)
                WHEN 'payment' THEN
                    IF NEW.debt_id IS NOT NULL THEN
                        -- Pago de deuda = EGRESO (resta del saldo)
                        balance_change := -NEW.amount;

                        -- Si es VES y es egreso, consumir capas FIFO
                        IF account_currency = 'VES' AND NEW.amount > 0 THEN
                            SELECT * INTO layer_result
                            FROM consume_ves_layers_fifo(NEW.bank_account_id, NEW.amount);

                            RAISE NOTICE 'Pago de deuda en VES: consumidas % capas, costo USD: $%.2f',
                                layer_result.layers_consumed, layer_result.consumed_usd;
                        END IF;

                    ELSIF NEW.receivable_id IS NOT NULL THEN
                        -- Cobro de cuenta por cobrar = INGRESO (suma al saldo)
                        balance_change := NEW.amount;

                        -- Si es VES y es ingreso, crear capa FIFO
                        IF account_currency = 'VES' AND NEW.amount > 0 THEN
                            IF NEW.exchange_rate_id IS NOT NULL THEN
                                SELECT rate INTO exchange_rate_value
                                FROM exchange_rates
                                WHERE id = NEW.exchange_rate_id;
                            END IF;

                            exchange_rate_value := COALESCE(exchange_rate_value, 200.0);

                            PERFORM create_ves_layer(
                                NEW.id,
                                NEW.bank_account_id,
                                NEW.amount,
                                exchange_rate_value,
                                NEW.user_id
                            );
                        END IF;
                    ELSE
                        -- Payment genérico sin debt_id ni receivable_id = INGRESO
                        balance_change := NEW.amount;
                    END IF;

                -- EGRESOS: Restan del saldo
                WHEN 'purchase', 'expense' THEN
                    balance_change := -NEW.amount;

                    -- Si es VES y es egreso, consumir capas FIFO
                    IF account_currency = 'VES' AND NEW.amount > 0 THEN
                        SELECT * INTO layer_result
                        FROM consume_ves_layers_fifo(NEW.bank_account_id, NEW.amount);

                        RAISE NOTICE 'Gasto en VES: consumidas % capas, costo USD: $%.2f',
                            layer_result.layers_consumed, layer_result.consumed_usd;
                    END IF;

                ELSE
                    balance_change := 0;
            END CASE;

            -- Actualizar el saldo de la cuenta bancaria
            UPDATE bank_accounts
            SET amount = amount + balance_change
            WHERE id = NEW.bank_account_id;

            RAISE NOTICE 'Saldo actualizado para cuenta %: cambio de % (tipo: %)',
                NEW.bank_account_id, balance_change, NEW.type;
        END IF;
        RETURN NEW;
    END IF;

    -- Manejar UPDATE y DELETE (simplificado - no modificar capas en estos casos)
    -- En producción, deberías revertir capas en UPDATE/DELETE

    IF TG_OP = 'UPDATE' THEN
        -- Revertir el efecto de la transacción anterior
        IF OLD.type = 'balance-change' AND OLD.bank_account_id IS NOT NULL AND OLD.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts
            SET amount = amount + OLD.amount
            WHERE id = OLD.bank_account_id;

            UPDATE bank_accounts
            SET amount = amount - OLD.amount
            WHERE id = OLD.destination_bank_account_id;

        ELSIF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            CASE OLD.type
                WHEN 'sale', 'cash' THEN
                    balance_change := -OLD.amount;
                WHEN 'payment' THEN
                    IF OLD.debt_id IS NOT NULL THEN
                        balance_change := OLD.amount;  -- Revertir egreso
                    ELSE
                        balance_change := -OLD.amount;  -- Revertir ingreso
                    END IF;
                WHEN 'purchase', 'expense' THEN
                    balance_change := OLD.amount;
                ELSE
                    balance_change := 0;
            END CASE;

            UPDATE bank_accounts
            SET amount = amount + balance_change
            WHERE id = OLD.bank_account_id;
        END IF;

        -- Aplicar el efecto de la nueva transacción
        IF NEW.type = 'balance-change' AND NEW.bank_account_id IS NOT NULL AND NEW.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts
            SET amount = amount - NEW.amount
            WHERE id = NEW.bank_account_id;

            UPDATE bank_accounts
            SET amount = amount + NEW.amount
            WHERE id = NEW.destination_bank_account_id;

        ELSIF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL AND NEW.type != 'balance-change' THEN
            CASE NEW.type
                WHEN 'sale', 'cash' THEN
                    balance_change := NEW.amount;
                WHEN 'payment' THEN
                    IF NEW.debt_id IS NOT NULL THEN
                        balance_change := -NEW.amount;  -- Egreso
                    ELSE
                        balance_change := NEW.amount;  -- Ingreso
                    END IF;
                WHEN 'purchase', 'expense' THEN
                    balance_change := -NEW.amount;
                ELSE
                    balance_change := 0;
            END CASE;

            UPDATE bank_accounts
            SET amount = amount + balance_change
            WHERE id = NEW.bank_account_id;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.type = 'balance-change' AND OLD.bank_account_id IS NOT NULL AND OLD.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts
            SET amount = amount + OLD.amount
            WHERE id = OLD.bank_account_id;

            UPDATE bank_accounts
            SET amount = amount - OLD.amount
            WHERE id = OLD.destination_bank_account_id;

        ELSIF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            CASE OLD.type
                WHEN 'sale', 'cash' THEN
                    balance_change := -OLD.amount;
                WHEN 'payment' THEN
                    IF OLD.debt_id IS NOT NULL THEN
                        balance_change := OLD.amount;  -- Revertir egreso
                    ELSE
                        balance_change := -OLD.amount;  -- Revertir ingreso
                    END IF;
                WHEN 'purchase', 'expense' THEN
                    balance_change := OLD.amount;
                ELSE
                    balance_change := 0;
            END CASE;

            UPDATE bank_accounts
            SET amount = amount + balance_change
            WHERE id = OLD.bank_account_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
DROP TRIGGER IF EXISTS trigger_update_bank_account_balance ON transactions;

CREATE TRIGGER trigger_update_bank_account_balance
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_account_balance();

-- Comentarios
COMMENT ON FUNCTION update_bank_account_balance() IS
'Función mejorada que actualiza saldos bancarios y gestiona capas VES FIFO.
- INGRESOS (suman): sale, cash, payment con receivable_id
- EGRESOS (restan): purchase, expense, payment con debt_id
- Cuentas VES: Crea capas al ingresar, consume FIFO al egresar';

COMMENT ON TRIGGER trigger_update_bank_account_balance ON transactions IS
'Trigger que gestiona saldos bancarios y capas VES FIFO automáticamente';

-- ============================================================================
-- FINALIZADO
-- ============================================================================
SELECT 'TRIGGER Y FUNCIONES VES FIFO CREADAS EXITOSAMENTE' as status;
