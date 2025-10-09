-- Reset all financial accounts to zero
-- This script safely resets all financial data for a fresh start
-- WARNING: This will delete all transactions, debts, receivables, and reset bank account balances

-- Step 1: Disable the trigger temporarily to prevent balance updates during deletion
DROP TRIGGER IF EXISTS trigger_update_bank_account_balance ON transactions;

-- Step 2: Delete all audit records (optional - keeps history clean)
TRUNCATE TABLE debts_audit CASCADE;
TRUNCATE TABLE receivables_audit CASCADE;
TRUNCATE TABLE transactions_audit CASCADE;
TRUNCATE TABLE notifications_audit CASCADE;

-- Step 3: Delete all transactions (this will not trigger balance updates now)
DELETE FROM transactions;

-- Step 4: Delete all debts
DELETE FROM debts;

-- Step 5: Delete all receivables
DELETE FROM receivables;

-- Step 6: Reset all bank account balances to zero
UPDATE bank_accounts SET amount = 0;

-- Step 7: Clear financial stats
TRUNCATE TABLE financial_stats CASCADE;
TRUNCATE TABLE expense_stats CASCADE;

-- Step 8: Clear notifications (optional)
DELETE FROM notifications;

-- Step 9: Clear calendar events (optional - uncomment if you want to delete events)
-- DELETE FROM calendar_events;

-- Step 10: Re-create the trigger function with the latest version (includes 'ingreso' and balance-change support)
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(18,2) := 0;
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

        -- Manejo normal para otros tipos de transacciones
        ELSIF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL AND NEW.type != 'balance-change' THEN
            -- Determinar el cambio de saldo basado en el tipo de transacción
            CASE NEW.type
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                    balance_change := NEW.amount;
                WHEN 'purchase', 'expense' THEN
                    balance_change := -NEW.amount;
                ELSE
                    balance_change := 0;
            END CASE;

            -- Actualizar el saldo de la cuenta bancaria
            UPDATE bank_accounts
            SET amount = amount + balance_change
            WHERE id = NEW.bank_account_id;
        END IF;
        RETURN NEW;
    END IF;

    -- Manejar UPDATE (transacción modificada)
    IF TG_OP = 'UPDATE' THEN
        -- Revertir el efecto de la transacción anterior
        IF OLD.type = 'balance-change' AND OLD.bank_account_id IS NOT NULL AND OLD.destination_bank_account_id IS NOT NULL THEN
            -- Revertir balance-change anterior: sumar a origen, restar de destino
            UPDATE bank_accounts
            SET amount = amount + OLD.amount
            WHERE id = OLD.bank_account_id;

            UPDATE bank_accounts
            SET amount = amount - OLD.amount
            WHERE id = OLD.destination_bank_account_id;

        ELSIF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            CASE OLD.type
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                    balance_change := -OLD.amount;
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
            -- Aplicar nuevo balance-change: restar de origen, sumar a destino
            UPDATE bank_accounts
            SET amount = amount - NEW.amount
            WHERE id = NEW.bank_account_id;

            UPDATE bank_accounts
            SET amount = amount + NEW.amount
            WHERE id = NEW.destination_bank_account_id;

        ELSIF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL AND NEW.type != 'balance-change' THEN
            CASE NEW.type
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                    balance_change := NEW.amount;
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

    -- Manejar DELETE (transacción eliminada)
    IF TG_OP = 'DELETE' THEN
        -- Revertir balance-change: sumar a origen, restar de destino
        IF OLD.type = 'balance-change' AND OLD.bank_account_id IS NOT NULL AND OLD.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts
            SET amount = amount + OLD.amount
            WHERE id = OLD.bank_account_id;

            UPDATE bank_accounts
            SET amount = amount - OLD.amount
            WHERE id = OLD.destination_bank_account_id;

        ELSIF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            -- Revertir el efecto de otros tipos de transacciones
            CASE OLD.type
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                    balance_change := -OLD.amount;
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

-- Re-enable the trigger for future transactions
CREATE TRIGGER trigger_update_bank_account_balance
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_account_balance();

-- Verification queries
SELECT 'Bank Accounts' as table_name, COUNT(*) as count, SUM(amount) as total_balance FROM bank_accounts
UNION ALL
SELECT 'Transactions', COUNT(*), SUM(amount) FROM transactions
UNION ALL
SELECT 'Debts', COUNT(*), SUM(amount) FROM debts
UNION ALL
SELECT 'Receivables', COUNT(*), SUM(amount) FROM receivables;
