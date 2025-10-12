-- Migration: Add VES Layers FIFO System for Historical Cost Tracking
-- Date: 2025-10-10
-- Description: Implements FIFO (First In, First Out) tracking for VES balances
-- to accurately calculate net worth based on historical exchange rates

-- ============================================================================
-- 1. CREATE VES LAYERS TABLE (FIFO Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bank_account_ves_layers (
    id VARCHAR(64) PRIMARY KEY,
    bank_account_id VARCHAR(64) NOT NULL,
    transaction_id VARCHAR(64),
    amount_ves DECIMAL(18,2) NOT NULL CHECK (amount_ves >= 0),
    remaining_ves DECIMAL(18,2) NOT NULL CHECK (remaining_ves >= 0),
    exchange_rate DECIMAL(10,6) NOT NULL CHECK (exchange_rate > 0),
    equivalent_usd DECIMAL(18,2) NOT NULL CHECK (equivalent_usd >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(64),

    -- Foreign Keys
    CONSTRAINT fk_ves_layer_bank_account
        FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_ves_layer_transaction
        FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL,
    CONSTRAINT fk_ves_layer_user
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,

    -- Ensure remaining_ves never exceeds amount_ves
    CONSTRAINT chk_remaining_ves_valid
        CHECK (remaining_ves <= amount_ves)
);

-- Add comments for documentation
COMMENT ON TABLE public.bank_account_ves_layers IS 'FIFO layers for tracking VES balances with historical exchange rates';
COMMENT ON COLUMN public.bank_account_ves_layers.amount_ves IS 'Original VES amount when layer was created';
COMMENT ON COLUMN public.bank_account_ves_layers.remaining_ves IS 'VES still available in this layer (FIFO consumption)';
COMMENT ON COLUMN public.bank_account_ves_layers.exchange_rate IS 'Exchange rate when VES entered (VES per USD)';
COMMENT ON COLUMN public.bank_account_ves_layers.equivalent_usd IS 'USD equivalent at time of entry (amount_ves / exchange_rate)';

-- ============================================================================
-- 2. ADD HISTORICAL COST FIELD TO BANK ACCOUNTS
-- ============================================================================

ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS historical_cost_usd DECIMAL(18,2) DEFAULT 0;

COMMENT ON COLUMN public.bank_accounts.historical_cost_usd IS 'Sum of USD equivalents from all VES layers (for VES accounts only)';

-- ============================================================================
-- 3. ADD PAYMENT TRACKING FIELDS TO DEBTS
-- ============================================================================

ALTER TABLE public.debts
ADD COLUMN IF NOT EXISTS paid_amount_usd DECIMAL(18,2) DEFAULT 0 CHECK (paid_amount_usd >= 0),
ADD COLUMN IF NOT EXISTS paid_amount_ves DECIMAL(18,2) DEFAULT 0 CHECK (paid_amount_ves >= 0),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6),
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);

COMMENT ON COLUMN public.debts.paid_amount_usd IS 'Total paid in USD (direct or converted from VES)';
COMMENT ON COLUMN public.debts.paid_amount_ves IS 'Total paid in VES (for reference only, tracking is in USD)';
COMMENT ON COLUMN public.debts.exchange_rate IS 'Exchange rate at time of debt creation';
COMMENT ON COLUMN public.debts.amount_usd IS 'Debt amount in USD (for tracking completion regardless of payment currency)';

-- Initialize amount_usd for existing debts
UPDATE public.debts
SET amount_usd = amount
WHERE amount_usd IS NULL;

-- ============================================================================
-- 4. ADD PAYMENT TRACKING FIELDS TO RECEIVABLES
-- ============================================================================

ALTER TABLE public.receivables
ADD COLUMN IF NOT EXISTS paid_amount_usd DECIMAL(18,2) DEFAULT 0 CHECK (paid_amount_usd >= 0),
ADD COLUMN IF NOT EXISTS paid_amount_ves DECIMAL(18,2) DEFAULT 0 CHECK (paid_amount_ves >= 0),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6),
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);

COMMENT ON COLUMN public.receivables.paid_amount_usd IS 'Total received in USD (direct or converted from VES)';
COMMENT ON COLUMN public.receivables.paid_amount_ves IS 'Total received in VES (for reference only, tracking is in USD)';
COMMENT ON COLUMN public.receivables.exchange_rate IS 'Exchange rate at time of receivable creation';
COMMENT ON COLUMN public.receivables.amount_usd IS 'Receivable amount in USD (for tracking completion regardless of payment currency)';

-- Initialize amount_usd for existing receivables
UPDATE public.receivables
SET amount_usd = amount
WHERE amount_usd IS NULL;

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for VES layers table
CREATE INDEX IF NOT EXISTS idx_ves_layers_bank_account
    ON public.bank_account_ves_layers(bank_account_id);

CREATE INDEX IF NOT EXISTS idx_ves_layers_user
    ON public.bank_account_ves_layers(user_id);

CREATE INDEX IF NOT EXISTS idx_ves_layers_transaction
    ON public.bank_account_ves_layers(transaction_id);

CREATE INDEX IF NOT EXISTS idx_ves_layers_remaining
    ON public.bank_account_ves_layers(remaining_ves)
    WHERE remaining_ves > 0;

CREATE INDEX IF NOT EXISTS idx_ves_layers_created
    ON public.bank_account_ves_layers(created_at);

-- Composite index for FIFO queries (most important for performance)
CREATE INDEX IF NOT EXISTS idx_ves_layers_fifo
    ON public.bank_account_ves_layers(bank_account_id, created_at, remaining_ves)
    WHERE remaining_ves > 0;

-- Indexes for debt/receivable payment tracking
CREATE INDEX IF NOT EXISTS idx_debts_paid_amount
    ON public.debts(paid_amount_usd);

CREATE INDEX IF NOT EXISTS idx_receivables_paid_amount
    ON public.receivables(paid_amount_usd);

-- ============================================================================
-- 6. ADD AUDIT TABLE FIELDS
-- ============================================================================

-- Add VES layer fields to transactions_audit (for tracking layer creation)
ALTER TABLE public.transactions_audit
ADD COLUMN IF NOT EXISTS ves_layer_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS ves_layers_consumed JSONB;

COMMENT ON COLUMN public.transactions_audit.ves_layer_id IS 'VES layer created by this transaction (if applicable)';
COMMENT ON COLUMN public.transactions_audit.ves_layers_consumed IS 'Array of VES layers consumed by this transaction with amounts';

-- Add payment tracking fields to debts_audit
ALTER TABLE public.debts_audit
ADD COLUMN IF NOT EXISTS paid_amount_usd DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS paid_amount_ves DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6),
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);

-- Add payment tracking fields to receivables_audit
ALTER TABLE public.receivables_audit
ADD COLUMN IF NOT EXISTS paid_amount_usd DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS paid_amount_ves DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6),
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);

-- ============================================================================
-- 7. CREATE FUNCTION TO UPDATE DEBT STATUS AUTOMATICALLY
-- ============================================================================

CREATE OR REPLACE FUNCTION update_debt_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-update status to 'paid' when debt is fully paid
    IF NEW.paid_amount_usd >= NEW.amount_usd THEN
        NEW.status := 'paid';
    ELSIF NEW.paid_amount_usd > 0 THEN
        -- Optional: Add 'partial' status if needed
        -- NEW.status := 'partial';
        NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic debt status updates
DROP TRIGGER IF EXISTS trigger_update_debt_status ON public.debts;
CREATE TRIGGER trigger_update_debt_status
    BEFORE INSERT OR UPDATE ON public.debts
    FOR EACH ROW
    WHEN (NEW.paid_amount_usd IS NOT NULL AND NEW.amount_usd IS NOT NULL)
    EXECUTE FUNCTION update_debt_status();

-- ============================================================================
-- 8. CREATE FUNCTION TO UPDATE RECEIVABLE STATUS AUTOMATICALLY
-- ============================================================================

CREATE OR REPLACE FUNCTION update_receivable_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-update status to 'paid' when receivable is fully received
    IF NEW.paid_amount_usd >= NEW.amount_usd THEN
        NEW.status := 'paid';
    ELSIF NEW.paid_amount_usd > 0 THEN
        -- Optional: Add 'partial' status if needed
        -- NEW.status := 'partial';
        NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic receivable status updates
DROP TRIGGER IF EXISTS trigger_update_receivable_status ON public.receivables;
CREATE TRIGGER trigger_update_receivable_status
    BEFORE INSERT OR UPDATE ON public.receivables
    FOR EACH ROW
    WHEN (NEW.paid_amount_usd IS NOT NULL AND NEW.amount_usd IS NOT NULL)
    EXECUTE FUNCTION update_receivable_status();

-- ============================================================================
-- 9. CREATE FUNCTION TO UPDATE HISTORICAL COST ON LAYER CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bank_account_historical_cost()
RETURNS TRIGGER AS $$
DECLARE
    account_currency VARCHAR(8);
    new_historical_cost DECIMAL(18,2);
BEGIN
    -- Get account currency
    SELECT currency INTO account_currency
    FROM public.bank_accounts
    WHERE id = COALESCE(NEW.bank_account_id, OLD.bank_account_id);

    -- Only update historical cost for VES accounts
    IF account_currency = 'VES' THEN
        -- Calculate new historical cost from all layers
        SELECT COALESCE(SUM(remaining_ves / exchange_rate), 0)
        INTO new_historical_cost
        FROM public.bank_account_ves_layers
        WHERE bank_account_id = COALESCE(NEW.bank_account_id, OLD.bank_account_id)
        AND remaining_ves > 0;

        -- Update bank account
        UPDATE public.bank_accounts
        SET historical_cost_usd = new_historical_cost,
            updated_at = NOW()
        WHERE id = COALESCE(NEW.bank_account_id, OLD.bank_account_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic historical cost updates
DROP TRIGGER IF EXISTS trigger_update_historical_cost ON public.bank_account_ves_layers;
CREATE TRIGGER trigger_update_historical_cost
    AFTER INSERT OR UPDATE OR DELETE ON public.bank_account_ves_layers
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_account_historical_cost();

-- ============================================================================
-- 10. CREATE VIEW FOR EASY NET WORTH CALCULATION
-- ============================================================================

CREATE OR REPLACE VIEW public.v_net_worth_breakdown AS
SELECT
    ba.user_id,

    -- USD Assets
    SUM(CASE WHEN ba.currency = 'USD' THEN ba.amount ELSE 0 END) as total_usd,

    -- VES Assets (nominal)
    SUM(CASE WHEN ba.currency = 'VES' THEN ba.amount ELSE 0 END) as total_ves,

    -- VES Historical Cost (in USD)
    SUM(CASE WHEN ba.currency = 'VES' THEN ba.historical_cost_usd ELSE 0 END) as total_ves_historical_cost_usd,

    -- Total Assets in USD
    SUM(CASE WHEN ba.currency = 'USD' THEN ba.amount ELSE 0 END) +
    SUM(CASE WHEN ba.currency = 'VES' THEN ba.historical_cost_usd ELSE 0 END) as total_assets_usd,

    -- Pending Debts (in USD)
    COALESCE((
        SELECT SUM(d.amount_usd - d.paid_amount_usd)
        FROM public.debts d
        WHERE d.user_id = ba.user_id
        AND d.status IN ('pending', 'overdue')
    ), 0) as total_pending_debts_usd,

    -- Pending Receivables (in USD)
    COALESCE((
        SELECT SUM(r.amount_usd - r.paid_amount_usd)
        FROM public.receivables r
        WHERE r.user_id = ba.user_id
        AND r.status IN ('pending', 'overdue')
    ), 0) as total_pending_receivables_usd,

    -- Net Worth (Assets - Debts)
    (
        SUM(CASE WHEN ba.currency = 'USD' THEN ba.amount ELSE 0 END) +
        SUM(CASE WHEN ba.currency = 'VES' THEN ba.historical_cost_usd ELSE 0 END)
    ) - COALESCE((
        SELECT SUM(d.amount_usd - d.paid_amount_usd)
        FROM public.debts d
        WHERE d.user_id = ba.user_id
        AND d.status IN ('pending', 'overdue')
    ), 0) as net_worth_usd

FROM public.bank_accounts ba
WHERE ba.user_id IS NOT NULL
GROUP BY ba.user_id;

COMMENT ON VIEW public.v_net_worth_breakdown IS 'Consolidated view of net worth calculation using FIFO historical cost for VES accounts';

-- ============================================================================
-- 11. GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_account_ves_layers TO authenticated;
GRANT SELECT ON public.v_net_worth_breakdown TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ Created bank_account_ves_layers table for FIFO tracking
-- ✅ Added historical_cost_usd to bank_accounts
-- ✅ Added payment tracking fields to debts and receivables
-- ✅ Created performance indexes
-- ✅ Added audit table fields
-- ✅ Created automatic status update triggers
-- ✅ Created historical cost calculation trigger
-- ✅ Created net worth breakdown view
-- ✅ Granted necessary permissions
