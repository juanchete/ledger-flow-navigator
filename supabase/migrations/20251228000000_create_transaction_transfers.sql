-- Migration: Create transaction_transfers table for multi-account operations
-- Permite que una operación se distribuya a múltiples cuentas bancarias

-- 1. Crear la tabla de transferencias
CREATE TABLE IF NOT EXISTS public.transaction_transfers (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    transaction_id VARCHAR(64) NOT NULL,
    bank_account_id VARCHAR(64) NOT NULL,
    amount DECIMAL(18,2) NOT NULL CHECK (amount > 0),
    receipt_url VARCHAR(512),
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_transaction_transfers_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES public.transactions(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_transaction_transfers_bank_account
        FOREIGN KEY (bank_account_id)
        REFERENCES public.bank_accounts(id)
);

-- 2. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_transaction_transfers_transaction_id
    ON public.transaction_transfers(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_transfers_bank_account_id
    ON public.transaction_transfers(bank_account_id);

-- 3. Agregar campo a transactions para indicar si usa múltiples transferencias
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS has_multiple_transfers BOOLEAN DEFAULT FALSE;

-- 4. Función para actualizar saldos basado en transaction_transfers
CREATE OR REPLACE FUNCTION update_transfer_bank_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_transaction RECORD;
    v_balance_change DECIMAL(18,2) := 0;
BEGIN
    -- Obtener la transacción padre
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);

    IF v_transaction IS NULL THEN
        RAISE EXCEPTION 'Transaction not found for transfer';
    END IF;

    -- Manejar INSERT (nueva transferencia)
    IF TG_OP = 'INSERT' THEN
        CASE v_transaction.type
            WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                v_balance_change := NEW.amount;
            WHEN 'purchase', 'expense' THEN
                v_balance_change := -NEW.amount;
            WHEN 'balance-change' THEN
                v_balance_change := NEW.amount;
            ELSE
                v_balance_change := 0;
        END CASE;

        UPDATE bank_accounts
        SET amount = amount + v_balance_change
        WHERE id = NEW.bank_account_id;

        RAISE NOTICE 'Transfer INSERT: % added to account %', v_balance_change, NEW.bank_account_id;
        RETURN NEW;
    END IF;

    -- Manejar UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Revertir el efecto anterior
        CASE v_transaction.type
            WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                v_balance_change := -OLD.amount;
            WHEN 'purchase', 'expense' THEN
                v_balance_change := OLD.amount;
            WHEN 'balance-change' THEN
                v_balance_change := -OLD.amount;
            ELSE
                v_balance_change := 0;
        END CASE;

        UPDATE bank_accounts
        SET amount = amount + v_balance_change
        WHERE id = OLD.bank_account_id;

        -- Aplicar el nuevo efecto
        CASE v_transaction.type
            WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                v_balance_change := NEW.amount;
            WHEN 'purchase', 'expense' THEN
                v_balance_change := -NEW.amount;
            WHEN 'balance-change' THEN
                v_balance_change := NEW.amount;
            ELSE
                v_balance_change := 0;
        END CASE;

        UPDATE bank_accounts
        SET amount = amount + v_balance_change
        WHERE id = NEW.bank_account_id;

        RETURN NEW;
    END IF;

    -- Manejar DELETE
    IF TG_OP = 'DELETE' THEN
        CASE v_transaction.type
            WHEN 'sale', 'payment', 'cash', 'ingreso' THEN
                v_balance_change := -OLD.amount;
            WHEN 'purchase', 'expense' THEN
                v_balance_change := OLD.amount;
            WHEN 'balance-change' THEN
                v_balance_change := -OLD.amount;
            ELSE
                v_balance_change := 0;
        END CASE;

        UPDATE bank_accounts
        SET amount = amount + v_balance_change
        WHERE id = OLD.bank_account_id;

        RAISE NOTICE 'Transfer DELETE: % removed from account %', v_balance_change, OLD.bank_account_id;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear el trigger para transaction_transfers
DROP TRIGGER IF EXISTS trigger_update_transfer_bank_balance ON transaction_transfers;

CREATE TRIGGER trigger_update_transfer_bank_balance
    AFTER INSERT OR UPDATE OR DELETE ON transaction_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_transfer_bank_balance();

-- 6. Modificar el trigger principal para saltar transacciones con múltiples transferencias
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    balance_change DECIMAL(18,2) := 0;
BEGIN
    -- Si la transacción tiene múltiples transferencias, NO procesar aquí
    IF TG_OP = 'INSERT' AND NEW.has_multiple_transfers = TRUE THEN
        RAISE NOTICE 'Skipping balance update - transaction has multiple transfers';
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.has_multiple_transfers = TRUE AND (OLD.has_multiple_transfers IS NULL OR OLD.has_multiple_transfers = FALSE) THEN
            -- Revertir efecto anterior si cambia a múltiples
            IF OLD.type = 'balance-change' AND OLD.bank_account_id IS NOT NULL AND OLD.destination_bank_account_id IS NOT NULL THEN
                UPDATE bank_accounts SET amount = amount + OLD.amount WHERE id = OLD.bank_account_id;
                UPDATE bank_accounts SET amount = amount - OLD.amount WHERE id = OLD.destination_bank_account_id;
            ELSIF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
                CASE OLD.type
                    WHEN 'sale', 'payment', 'cash', 'ingreso' THEN balance_change := -OLD.amount;
                    WHEN 'purchase', 'expense' THEN balance_change := OLD.amount;
                    ELSE balance_change := 0;
                END CASE;
                UPDATE bank_accounts SET amount = amount + balance_change WHERE id = OLD.bank_account_id;
            END IF;
            RETURN NEW;
        END IF;

        IF NEW.has_multiple_transfers = TRUE THEN
            RETURN NEW;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' AND OLD.has_multiple_transfers = TRUE THEN
        RETURN OLD;
    END IF;

    -- Lógica existente para transacciones simples
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'balance-change' AND NEW.bank_account_id IS NOT NULL AND NEW.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts SET amount = amount - NEW.amount WHERE id = NEW.bank_account_id;
            UPDATE bank_accounts SET amount = amount + NEW.amount WHERE id = NEW.destination_bank_account_id;
        ELSIF NEW.bank_account_id IS NOT NULL AND NEW.type IS NOT NULL AND NEW.type != 'balance-change' THEN
            CASE NEW.type
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN balance_change := NEW.amount;
                WHEN 'purchase', 'expense' THEN balance_change := -NEW.amount;
                ELSE balance_change := 0;
            END CASE;
            UPDATE bank_accounts SET amount = amount + balance_change WHERE id = NEW.bank_account_id;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.type = 'balance-change' AND OLD.bank_account_id IS NOT NULL AND OLD.destination_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts SET amount = amount + OLD.amount WHERE id = OLD.bank_account_id;
            UPDATE bank_accounts SET amount = amount - OLD.amount WHERE id = OLD.destination_bank_account_id;
        ELSIF OLD.bank_account_id IS NOT NULL AND OLD.type IS NOT NULL AND OLD.type != 'balance-change' THEN
            CASE OLD.type
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN balance_change := -OLD.amount;
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
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN balance_change := NEW.amount;
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
                WHEN 'sale', 'payment', 'cash', 'ingreso' THEN balance_change := -OLD.amount;
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

-- 7. Comentarios
COMMENT ON TABLE public.transaction_transfers IS
'Almacena las distribuciones individuales de una transacción a múltiples cuentas bancarias.';

COMMENT ON COLUMN public.transactions.has_multiple_transfers IS
'Indica si esta transacción tiene múltiples destinos en transaction_transfers.';
