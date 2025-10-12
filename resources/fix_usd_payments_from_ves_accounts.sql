-- ============================================================================
-- CORREGIR TRIGGER PARA MANEJAR PAGOS EN USD DESDE CUENTAS VES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(18,2) := 0;
    account_currency VARCHAR(3);
    layer_result RECORD;
    exchange_rate_value DECIMAL(10,6);
    amount_in_account_currency DECIMAL(18,2);
BEGIN
    -- Manejar INSERT (nueva transacción)
    IF TG_OP = 'INSERT' THEN
        -- Manejo especial para balance-change (transferencia entre cuentas propias)
        IF NEW.type = 'balance-change' AND NEW.bank_account_id IS NOT NULL AND NEW.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts
            SET amount = amount - NEW.amount
            WHERE id = NEW.bank_account_id;

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

            -- Obtener tasa de cambio si existe
            IF NEW.exchange_rate_id IS NOT NULL THEN
                SELECT rate INTO exchange_rate_value
                FROM exchange_rates
                WHERE id = NEW.exchange_rate_id;
            END IF;

            exchange_rate_value := COALESCE(exchange_rate_value, 200.0);

            -- Convertir monto a moneda de la cuenta si es necesario
            IF NEW.currency = 'USD' AND account_currency = 'VES' THEN
                -- Transacción en USD pero cuenta en VES: convertir USD a VES
                amount_in_account_currency := NEW.amount * exchange_rate_value;
                RAISE NOTICE 'Conversión: %.2f USD × %.2f = %.2f VES',
                    NEW.amount, exchange_rate_value, amount_in_account_currency;
            ELSIF NEW.currency = 'VES' AND account_currency = 'USD' THEN
                -- Transacción en VES pero cuenta en USD: convertir VES a USD
                amount_in_account_currency := NEW.amount / exchange_rate_value;
                RAISE NOTICE 'Conversión: %.2f VES ÷ %.2f = %.2f USD',
                    NEW.amount, exchange_rate_value, amount_in_account_currency;
            ELSE
                -- Misma moneda: sin conversión
                amount_in_account_currency := NEW.amount;
            END IF;

            -- Determinar el cambio de saldo basado en el tipo de transacción
            CASE NEW.type
                -- INGRESOS: Suman al saldo
                WHEN 'sale', 'cash' THEN
                    balance_change := amount_in_account_currency;

                    -- Si es cuenta VES y es ingreso, crear capa FIFO
                    IF account_currency = 'VES' AND amount_in_account_currency > 0 THEN
                        PERFORM create_ves_layer(
                            NEW.id,
                            NEW.bank_account_id,
                            amount_in_account_currency,
                            exchange_rate_value,
                            NEW.user_id
                        );
                    END IF;

                -- PAYMENT: Depende si es ingreso (receivable) o egreso (debt)
                WHEN 'payment' THEN
                    IF NEW.debt_id IS NOT NULL THEN
                        -- Pago de deuda = EGRESO (resta del saldo)
                        balance_change := -amount_in_account_currency;

                        -- Si es cuenta VES y es egreso, consumir capas FIFO
                        IF account_currency = 'VES' AND amount_in_account_currency > 0 THEN
                            SELECT * INTO layer_result
                            FROM consume_ves_layers_fifo(NEW.bank_account_id, amount_in_account_currency);

                            RAISE NOTICE 'Pago de deuda (%.2f %s = %.2f VES): consumidas % capas, costo USD: $%.2f',
                                NEW.amount, NEW.currency, amount_in_account_currency,
                                layer_result.layers_consumed, layer_result.consumed_usd;
                        END IF;

                    ELSIF NEW.receivable_id IS NOT NULL THEN
                        -- Cobro de cuenta por cobrar = INGRESO (suma al saldo)
                        balance_change := amount_in_account_currency;

                        -- Si es cuenta VES y es ingreso, crear capa FIFO
                        IF account_currency = 'VES' AND amount_in_account_currency > 0 THEN
                            PERFORM create_ves_layer(
                                NEW.id,
                                NEW.bank_account_id,
                                amount_in_account_currency,
                                exchange_rate_value,
                                NEW.user_id
                            );
                        END IF;
                    ELSE
                        -- Payment genérico sin debt_id ni receivable_id = INGRESO
                        balance_change := amount_in_account_currency;
                    END IF;

                -- EGRESOS: Restan del saldo
                WHEN 'purchase', 'expense' THEN
                    balance_change := -amount_in_account_currency;

                    -- Si es cuenta VES y es egreso, consumir capas FIFO
                    IF account_currency = 'VES' AND amount_in_account_currency > 0 THEN
                        SELECT * INTO layer_result
                        FROM consume_ves_layers_fifo(NEW.bank_account_id, amount_in_account_currency);

                        RAISE NOTICE 'Gasto (%.2f %s = %.2f VES): consumidas % capas, costo USD: $%.2f',
                            NEW.amount, NEW.currency, amount_in_account_currency,
                            layer_result.layers_consumed, layer_result.consumed_usd;
                    END IF;

                ELSE
                    balance_change := 0;
            END CASE;

            -- Actualizar el saldo de la cuenta bancaria
            UPDATE bank_accounts
            SET amount = amount + balance_change
            WHERE id = NEW.bank_account_id;

            RAISE NOTICE 'Saldo actualizado para cuenta %: cambio de %.2f %s (tipo: %)',
                NEW.bank_account_id, balance_change, account_currency, NEW.type;
        END IF;
        RETURN NEW;
    END IF;

    -- Manejar UPDATE y DELETE
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
                        balance_change := OLD.amount;
                    ELSE
                        balance_change := -OLD.amount;
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
                        balance_change := -NEW.amount;
                    ELSE
                        balance_change := NEW.amount;
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
                        balance_change := OLD.amount;
                    ELSE
                        balance_change := -OLD.amount;
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

COMMENT ON FUNCTION update_bank_account_balance() IS
'Función mejorada que actualiza saldos bancarios y gestiona capas VES FIFO.
- Maneja conversión automática USD↔VES según moneda de cuenta
- INGRESOS (suman): sale, cash, payment con receivable_id
- EGRESOS (restan): purchase, expense, payment con debt_id
- Cuentas VES: Crea capas al ingresar, consume FIFO al egresar
- Conversión: Si pago $100 USD desde cuenta VES @ tasa 200 → consume 20,000 VES';

SELECT 'TRIGGER ACTUALIZADO PARA MANEJAR USD DESDE CUENTAS VES' as status;
