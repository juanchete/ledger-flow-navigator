-- Trigger para actualizar automáticamente los saldos de las cuentas bancarias
-- cuando se insertan, actualizan o eliminan transacciones

-- Función que actualiza el saldo de la cuenta bancaria
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(18,2) := 0;
BEGIN
    -- Manejar INSERT (nueva transacción)
    IF TG_OP = 'INSERT' THEN
        IF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL THEN
            -- Determinar el cambio de saldo basado en el tipo de transacción
            CASE NEW.type
                WHEN 'sale', 'payment', 'banking' THEN
                    balance_change := NEW.amount;
                WHEN 'purchase', 'expense' THEN
                    balance_change := -NEW.amount;
                WHEN 'balance-change' THEN
                    balance_change := NEW.amount;
                ELSE
                    balance_change := 0;
            END CASE;
            
            -- Actualizar el saldo de la cuenta bancaria
            UPDATE bank_accounts 
            SET amount = amount + balance_change 
            WHERE id = NEW.bank_account_id;
            
            -- Log para debugging (opcional)
            RAISE NOTICE 'Saldo actualizado para cuenta %: cambio de %', NEW.bank_account_id, balance_change;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Manejar UPDATE (transacción modificada)
    IF TG_OP = 'UPDATE' THEN
        -- Revertir el efecto de la transacción anterior si tenía cuenta bancaria
        IF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL THEN
            CASE OLD.type
                WHEN 'sale', 'payment', 'banking' THEN
                    balance_change := -OLD.amount;
                WHEN 'purchase', 'expense' THEN
                    balance_change := OLD.amount;
                WHEN 'balance-change' THEN
                    balance_change := -OLD.amount;
                ELSE
                    balance_change := 0;
            END CASE;
            
            UPDATE bank_accounts 
            SET amount = amount + balance_change 
            WHERE id = OLD.bank_account_id;
        END IF;
        
        -- Aplicar el efecto de la nueva transacción si tiene cuenta bancaria
        IF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL THEN
            CASE NEW.type
                WHEN 'sale', 'payment', 'banking' THEN
                    balance_change := NEW.amount;
                WHEN 'purchase', 'expense' THEN
                    balance_change := -NEW.amount;
                WHEN 'balance-change' THEN
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
    
    -- Manejar DELETE (transacción eliminada)
    IF TG_OP = 'DELETE' THEN
        IF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL THEN
            -- Revertir el efecto de la transacción
            CASE OLD.type
                WHEN 'sale', 'payment', 'banking' THEN
                    balance_change := -OLD.amount;
                WHEN 'purchase', 'expense' THEN
                    balance_change := OLD.amount;
                WHEN 'balance-change' THEN
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
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Eliminar el trigger si ya existe
DROP TRIGGER IF EXISTS trigger_update_bank_account_balance ON transactions;

-- Crear el trigger para actualización de saldos
CREATE TRIGGER trigger_update_bank_account_balance
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_account_balance();

-- Comentario explicativo
COMMENT ON FUNCTION update_bank_account_balance() IS 
'Función que actualiza automáticamente los saldos de las cuentas bancarias cuando se modifican transacciones. 
Tipos de transacción que SUMAN al saldo: sale, payment, banking
Tipos de transacción que RESTAN del saldo: purchase, expense
Tipo especial: balance-change (puede ser + o -)';

COMMENT ON TRIGGER trigger_update_bank_account_balance ON transactions IS 
'Trigger que ejecuta la actualización automática de saldos después de INSERT, UPDATE o DELETE en transacciones'; 