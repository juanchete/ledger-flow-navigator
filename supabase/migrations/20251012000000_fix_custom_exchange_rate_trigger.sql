-- Migration: Fix update_bank_account_balance to use custom_exchange_rate
-- Date: 2025-10-12
-- Description: The trigger was ignoring custom_exchange_rate field, causing incorrect conversions

CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(18,2) := 0;
    account_currency VARCHAR(3);
    account_user_id UUID;
    layer_result RECORD;
    exchange_rate_value DECIMAL(10,6);
    amount_in_account_currency DECIMAL(18,2);
    transaction_date DATE;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'balance-change' AND NEW.bank_account_id IS NOT NULL AND NEW.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts
            SET amount = amount - NEW.amount
            WHERE id = NEW.bank_account_id;

            UPDATE bank_accounts
            SET amount = amount + NEW.amount
            WHERE id = NEW.destination_bank_account_id;

            RAISE NOTICE 'Balance-change: Descontado % de cuenta % y sumado a cuenta %',
                NEW.amount, NEW.bank_account_id, NEW.destination_bank_account_id;

        ELSIF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL AND NEW.type != 'balance-change' THEN

            -- Obtener currency Y user_id de la cuenta bancaria
            SELECT currency, user_id INTO account_currency, account_user_id
            FROM bank_accounts
            WHERE id = NEW.bank_account_id;

            -- ✅ FIX: Priorizar custom_exchange_rate antes de buscar en la tabla
            IF NEW.custom_exchange_rate IS NOT NULL AND NEW.custom_exchange_rate > 0 THEN
                -- Usar la tasa customizada del usuario
                exchange_rate_value := NEW.custom_exchange_rate;
                RAISE NOTICE 'Usando custom_exchange_rate: %.6f', exchange_rate_value;

            ELSIF NEW.exchange_rate_id IS NOT NULL THEN
                -- Usar la tasa especificada por ID
                SELECT rate INTO exchange_rate_value
                FROM exchange_rates
                WHERE id = NEW.exchange_rate_id;
                RAISE NOTICE 'Usando exchange_rate_id: %, rate: %.6f', NEW.exchange_rate_id, exchange_rate_value;

            ELSE
                -- Buscar la tasa más reciente para la fecha de la transacción
                transaction_date := DATE(NEW.date);
                SELECT rate INTO exchange_rate_value
                FROM exchange_rates
                WHERE date <= transaction_date
                ORDER BY date DESC
                LIMIT 1;
                RAISE NOTICE 'Usando tasa más reciente para fecha %: %.6f', transaction_date, exchange_rate_value;
            END IF;

            -- Fallback a 200 solo si no existe ninguna tasa en el sistema
            exchange_rate_value := COALESCE(exchange_rate_value, 200.0);

            -- Convertir monto según monedas
            IF NEW.currency = 'USD' AND account_currency = 'VES' THEN
                amount_in_account_currency := NEW.amount * exchange_rate_value;
                RAISE NOTICE 'Conversión USD->VES: %.2f USD × %.6f = %.2f VES',
                    NEW.amount, exchange_rate_value, amount_in_account_currency;

            ELSIF NEW.currency = 'VES' AND account_currency = 'USD' THEN
                amount_in_account_currency := NEW.amount / exchange_rate_value;
                RAISE NOTICE 'Conversión VES->USD: %.2f VES ÷ %.6f = %.2f USD',
                    NEW.amount, exchange_rate_value, amount_in_account_currency;
            ELSE
                amount_in_account_currency := NEW.amount;
            END IF;

            -- Aplicar el cambio según el tipo de transacción
            CASE NEW.type
                WHEN 'sale', 'cash', 'ingreso' THEN
                    balance_change := amount_in_account_currency;

                    IF account_currency = 'VES' AND amount_in_account_currency > 0 THEN
                        PERFORM create_ves_layer(
                            NEW.id,
                            NEW.bank_account_id,
                            amount_in_account_currency,
                            exchange_rate_value,
                            account_user_id
                        );
                    END IF;

                WHEN 'payment' THEN
                    IF NEW.debt_id IS NOT NULL THEN
                        -- Pago de deuda: resta del banco
                        balance_change := -amount_in_account_currency;

                        IF account_currency = 'VES' AND amount_in_account_currency > 0 THEN
                            SELECT * INTO layer_result
                            FROM consume_ves_layers_fifo(NEW.bank_account_id, amount_in_account_currency);

                            RAISE NOTICE 'Pago de deuda (%.2f %s = %.2f VES): consumidas % capas, costo USD: $%.2f',
                                NEW.amount, NEW.currency, amount_in_account_currency,
                                layer_result.layers_consumed, layer_result.consumed_usd;
                        END IF;

                    ELSIF NEW.receivable_id IS NOT NULL THEN
                        -- Cobro de cuenta por cobrar: suma al banco
                        balance_change := amount_in_account_currency;

                        IF account_currency = 'VES' AND amount_in_account_currency > 0 THEN
                            PERFORM create_ves_layer(
                                NEW.id,
                                NEW.bank_account_id,
                                amount_in_account_currency,
                                exchange_rate_value,
                                account_user_id
                            );
                        END IF;
                    ELSE
                        balance_change := amount_in_account_currency;
                    END IF;

                WHEN 'purchase', 'expense' THEN
                    balance_change := -amount_in_account_currency;

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

            UPDATE bank_accounts
            SET amount = amount + balance_change
            WHERE id = NEW.bank_account_id;

            RAISE NOTICE 'Saldo actualizado para cuenta %: cambio de %.2f %s (tipo: %)',
                NEW.bank_account_id, balance_change, account_currency, NEW.type;
        END IF;
        RETURN NEW;
    END IF;

    -- Resto del trigger para UPDATE y DELETE permanece igual
    IF TG_OP = 'UPDATE' THEN
        IF OLD.type = 'balance-change' AND OLD.bank_account_id IS NOT NULL AND OLD.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts SET amount = amount + OLD.amount WHERE id = OLD.bank_account_id;
            UPDATE bank_accounts SET amount = amount - OLD.amount WHERE id = OLD.destination_bank_account_id;
        ELSIF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            CASE OLD.type
                WHEN 'sale', 'cash', 'ingreso' THEN balance_change := -OLD.amount;
                WHEN 'payment' THEN
                    IF OLD.debt_id IS NOT NULL THEN balance_change := OLD.amount;
                    ELSE balance_change := -OLD.amount;
                    END IF;
                WHEN 'purchase', 'expense' THEN balance_change := OLD.amount;
                ELSE balance_change := 0;
            END CASE;
            UPDATE bank_accounts SET amount = amount + balance_change WHERE id = OLD.bank_account_id;
        END IF;

        IF NEW.type = 'balance-change' AND NEW.bank_account_id IS NOT NULL AND NEW.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts SET amount = amount - NEW.amount WHERE id = NEW.bank_account_id;
            UPDATE bank_accounts SET amount = amount + NEW.amount WHERE id = NEW.destination_bank_account_id;
        ELSIF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL AND NEW.type != 'balance-change' THEN
            CASE NEW.type
                WHEN 'sale', 'cash', 'ingreso' THEN balance_change := NEW.amount;
                WHEN 'payment' THEN
                    IF NEW.debt_id IS NOT NULL THEN balance_change := -NEW.amount;
                    ELSE balance_change := NEW.amount;
                    END IF;
                WHEN 'purchase', 'expense' THEN balance_change := -NEW.amount;
                ELSE balance_change := 0;
            END CASE;
            UPDATE bank_accounts SET amount = amount + balance_change WHERE id = NEW.bank_account_id;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.type = 'balance-change' AND OLD.bank_account_id IS NOT NULL AND OLD.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts SET amount = amount + OLD.amount WHERE id = OLD.bank_account_id;
            UPDATE bank_accounts SET amount = amount - OLD.amount WHERE id = OLD.destination_bank_account_id;
        ELSIF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            CASE OLD.type
                WHEN 'sale', 'cash', 'ingreso' THEN balance_change := -OLD.amount;
                WHEN 'payment' THEN
                    IF OLD.debt_id IS NOT NULL THEN balance_change := OLD.amount;
                    ELSE balance_change := -OLD.amount;
                    END IF;
                WHEN 'purchase', 'expense' THEN balance_change := OLD.amount;
                ELSE balance_change := 0;
            END CASE;
            UPDATE bank_accounts SET amount = amount + balance_change WHERE id = OLD.bank_account_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Comentario sobre el fix
COMMENT ON FUNCTION public.update_bank_account_balance() IS
'Actualiza el balance de cuentas bancarias según transacciones. PRIORIZA custom_exchange_rate sobre otras tasas.';
