-- Add columns for balance-change specific data to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS bank_commission DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS transfer_count INTEGER,
ADD COLUMN IF NOT EXISTS destination_bank_account_id VARCHAR(64);

-- Add comment explaining the new fields
COMMENT ON COLUMN public.transactions.bank_commission IS 'Commission charged by the bank for balance-change transactions';
COMMENT ON COLUMN public.transactions.transfer_count IS 'Number of transfers made for balance-change transactions';
COMMENT ON COLUMN public.transactions.destination_bank_account_id IS 'Destination bank account for balance-change transactions (transfer between own accounts)';

-- Add denominations column (JSON format for bill breakdown)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS denominations JSONB;

-- Add foreign key constraint for destination bank account
ALTER TABLE public.transactions 
ADD CONSTRAINT IF NOT EXISTS fk_transactions_destination_bank_account 
FOREIGN KEY (destination_bank_account_id) REFERENCES public.bank_accounts(id);

-- Add the same columns to the audit table
ALTER TABLE public.transactions_audit
ADD COLUMN IF NOT EXISTS bank_commission DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS transfer_count INTEGER,
ADD COLUMN IF NOT EXISTS destination_bank_account_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS denominations JSONB;

-- Update the trigger function to handle balance-change transfers correctly
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
                WHEN 'sale', 'payment', 'banking' THEN
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
                WHEN 'sale', 'payment', 'banking' THEN
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
                WHEN 'sale', 'payment', 'banking' THEN
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
                WHEN 'sale', 'payment', 'banking' THEN
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