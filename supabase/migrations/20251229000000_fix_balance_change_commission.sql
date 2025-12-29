-- Migration: Fix balance-change commission handling
-- Description: Update trigger to correctly handle commission in balance-change transactions
-- The commission should only be debited from the source account, not credited to destination
--
-- Example: Transfer 1000 VES with 2% commission
-- - Source account: -1020 (1000 base + 20 commission)
-- - Destination account: +1000 (only base amount)

-- Drop and recreate the trigger function
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(18,2) := 0;
    source_debit DECIMAL(18,2) := 0;
    commission_amount DECIMAL(18,2) := 0;
BEGIN
    -- Manejar INSERT (nueva transacción)
    IF TG_OP = 'INSERT' THEN
        -- Manejo especial para balance-change (transferencia entre cuentas propias)
        IF NEW.type = 'balance-change' AND NEW.bank_account_id IS NOT NULL AND NEW.destination_bank_account_id IS NOT NULL THEN
            -- Calcular la comisión si existe
            IF NEW.bank_commission IS NOT NULL AND NEW.bank_commission > 0 THEN
                commission_amount := (NEW.amount * NEW.bank_commission) / 100;
            END IF;

            -- Calcular el débito total del origen (monto base + comisión)
            source_debit := NEW.amount + commission_amount;

            -- Descontar de la cuenta origen (monto + comisión)
            UPDATE bank_accounts
            SET amount = amount - source_debit
            WHERE id = NEW.bank_account_id;

            -- Sumar a la cuenta destino (solo monto base, sin comisión)
            UPDATE bank_accounts
            SET amount = amount + NEW.amount
            WHERE id = NEW.destination_bank_account_id;

            -- Log para debugging
            RAISE NOTICE 'Balance-change: Descontado % (base: %, comisión: %) de cuenta % y sumado % a cuenta %',
                source_debit, NEW.amount, commission_amount, NEW.bank_account_id, NEW.amount, NEW.destination_bank_account_id;

        -- Manejo normal para otros tipos de transacciones
        ELSIF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL AND NEW.type != 'balance-change' THEN
            -- Determinar el cambio de saldo basado en el tipo de transacción
            CASE NEW.type
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                    balance_change := NEW.amount;
                WHEN 'purchase', 'expense', 'outcome' THEN
                    balance_change := -NEW.amount;
                ELSE
                    balance_change := 0;
            END CASE;

            -- Actualizar el saldo de la cuenta bancaria
            UPDATE bank_accounts
            SET amount = amount + balance_change
            WHERE id = NEW.bank_account_id;

            -- Log para debugging
            RAISE NOTICE 'Saldo actualizado para cuenta %: cambio de %', NEW.bank_account_id, balance_change;
        END IF;
        RETURN NEW;
    END IF;

    -- Manejar UPDATE (transacción modificada)
    IF TG_OP = 'UPDATE' THEN
        -- Revertir el efecto de la transacción anterior
        IF OLD.type = 'balance-change' AND OLD.bank_account_id IS NOT NULL AND OLD.destination_bank_account_id IS NOT NULL THEN
            -- Calcular comisión del registro anterior
            commission_amount := 0;
            IF OLD.bank_commission IS NOT NULL AND OLD.bank_commission > 0 THEN
                commission_amount := (OLD.amount * OLD.bank_commission) / 100;
            END IF;
            source_debit := OLD.amount + commission_amount;

            -- Revertir balance-change anterior: sumar al origen (con comisión), restar del destino (sin comisión)
            UPDATE bank_accounts
            SET amount = amount + source_debit
            WHERE id = OLD.bank_account_id;

            UPDATE bank_accounts
            SET amount = amount - OLD.amount
            WHERE id = OLD.destination_bank_account_id;

        ELSIF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            CASE OLD.type
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                    balance_change := -OLD.amount;
                WHEN 'purchase', 'expense', 'outcome' THEN
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
            -- Calcular comisión del nuevo registro
            commission_amount := 0;
            IF NEW.bank_commission IS NOT NULL AND NEW.bank_commission > 0 THEN
                commission_amount := (NEW.amount * NEW.bank_commission) / 100;
            END IF;
            source_debit := NEW.amount + commission_amount;

            -- Aplicar nuevo balance-change: restar del origen (con comisión), sumar al destino (sin comisión)
            UPDATE bank_accounts
            SET amount = amount - source_debit
            WHERE id = NEW.bank_account_id;

            UPDATE bank_accounts
            SET amount = amount + NEW.amount
            WHERE id = NEW.destination_bank_account_id;

        ELSIF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL AND NEW.type != 'balance-change' THEN
            CASE NEW.type
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                    balance_change := NEW.amount;
                WHEN 'purchase', 'expense', 'outcome' THEN
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

    -- Manejar DELETE (transacción eliminada)
    IF TG_OP = 'DELETE' THEN
        -- Revertir balance-change: sumar a origen (con comisión), restar de destino (sin comisión)
        IF OLD.type = 'balance-change' AND OLD.bank_account_id IS NOT NULL AND OLD.destination_bank_account_id IS NOT NULL THEN
            -- Calcular comisión
            commission_amount := 0;
            IF OLD.bank_commission IS NOT NULL AND OLD.bank_commission > 0 THEN
                commission_amount := (OLD.amount * OLD.bank_commission) / 100;
            END IF;
            source_debit := OLD.amount + commission_amount;

            UPDATE bank_accounts
            SET amount = amount + source_debit
            WHERE id = OLD.bank_account_id;

            UPDATE bank_accounts
            SET amount = amount - OLD.amount
            WHERE id = OLD.destination_bank_account_id;

        ELSIF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            -- Revertir el efecto de otros tipos de transacciones
            CASE OLD.type
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                    balance_change := -OLD.amount;
                WHEN 'purchase', 'expense', 'outcome' THEN
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

-- Update comments
COMMENT ON FUNCTION update_bank_account_balance() IS
'Función que actualiza automáticamente los saldos de las cuentas bancarias cuando se modifican transacciones.
Tipos de transacción que SUMAN al saldo: sale, payment, cash, ingreso
Tipos de transacción que RESTAN del saldo: purchase, expense, outcome
Tipo especial: balance-change (transfiere entre cuentas propias, la comisión solo se resta del origen)';
