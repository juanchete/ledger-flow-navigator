-- Migration to fix the bank account balance trigger with correct logic
-- Pago: Pierdo dinero (-)
-- Gasto: Pierdo dinero (-)
-- Ingreso: Gano dinero (+)
-- Venta: Gano dinero (+)
-- Compra: Pierdo dinero (-)
-- Cash: Can be either (+) or (-) depending on context

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS update_bank_account_balance_trigger ON transactions;

-- Update the function with correct balance logic
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(18,2) := 0;
BEGIN
    -- Handle INSERT (new transaction)
    IF TG_OP = 'INSERT' THEN
        IF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL THEN
            -- Determine balance change based on transaction type
            CASE NEW.type
                WHEN 'sale', 'ingreso' THEN
                    -- Gano dinero
                    balance_change := NEW.amount;
                WHEN 'payment', 'expense', 'purchase' THEN
                    -- Pierdo dinero
                    balance_change := -NEW.amount;
                WHEN 'cash' THEN
                    -- Cash can be positive or negative based on the amount sign
                    balance_change := NEW.amount;
                ELSE
                    balance_change := 0;
            END CASE;
            
            -- Update bank account balance
            UPDATE bank_accounts 
            SET amount = amount + balance_change 
            WHERE id = NEW.bank_account_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (modified transaction)
    IF TG_OP = 'UPDATE' THEN
        -- Revert old transaction effect if it had a bank account
        IF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            CASE OLD.type
                WHEN 'sale', 'ingreso' THEN
                    balance_change := -OLD.amount;
                WHEN 'payment', 'expense', 'purchase' THEN
                    balance_change := OLD.amount;
                WHEN 'cash' THEN
                    balance_change := -OLD.amount;
                ELSE
                    balance_change := 0;
            END CASE;
            
            UPDATE bank_accounts 
            SET amount = amount + balance_change 
            WHERE id = OLD.bank_account_id;
        END IF;
        
        -- Apply new transaction effect if it has a bank account
        IF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL AND NEW.type != 'balance-change' THEN
            CASE NEW.type
                WHEN 'sale', 'ingreso' THEN
                    balance_change := NEW.amount;
                WHEN 'payment', 'expense', 'purchase' THEN
                    balance_change := -NEW.amount;
                WHEN 'cash' THEN
                    balance_change := NEW.amount;
                ELSE
                    balance_change := 0;
            END CASE;
            
            UPDATE bank_accounts 
            SET amount = amount + balance_change 
            WHERE id = NEW.bank_account_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            CASE OLD.type
                WHEN 'sale', 'ingreso' THEN
                    balance_change := -OLD.amount;
                WHEN 'payment', 'expense', 'purchase' THEN
                    balance_change := OLD.amount;
                WHEN 'cash' THEN
                    balance_change := -OLD.amount;
                ELSE
                    balance_change := 0;
            END CASE;
            
            UPDATE bank_accounts 
            SET amount = amount + balance_change 
            WHERE id = OLD.bank_account_id;
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_bank_account_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_account_balance();

-- Summary of changes:
-- Pago (payment): Now decreases balance (-)
-- Gasto (expense): Decreases balance (-)
-- Ingreso: Increases balance (+)
-- Venta (sale): Increases balance (+)
-- Compra (purchase): Decreases balance (-)
-- Cash: Keeps its flexible behavior