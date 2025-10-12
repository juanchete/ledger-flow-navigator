-- Migration: Retroactively create VES layers from existing transactions
-- Description: Creates VES layers for all existing VES transactions that don't have layers yet

-- Function to create retroactive VES layers
CREATE OR REPLACE FUNCTION create_retroactive_ves_layers()
RETURNS TABLE(
  transaction_id VARCHAR(64),
  bank_account_id VARCHAR(64),
  layers_created INTEGER,
  message TEXT
) AS $$
DECLARE
  transaction_record RECORD;
  layer_count INTEGER;
  existing_layers INTEGER;
BEGIN
  -- Loop through all VES transactions that added money to accounts
  FOR transaction_record IN
    SELECT
      t.id,
      t.to_bank_account_id,
      t.amount,
      t.exchange_rate,
      t.created_at,
      t.transaction_type,
      ba.currency
    FROM public.transactions t
    JOIN public.bank_accounts ba ON ba.id = t.to_bank_account_id
    WHERE ba.currency = 'VES'
      AND t.to_bank_account_id IS NOT NULL
      AND t.amount > 0
      AND t.transaction_type IN ('sale', 'cash', 'balance-change')
    ORDER BY t.created_at ASC
  LOOP
    -- Check if layer already exists for this transaction
    SELECT COUNT(*) INTO existing_layers
    FROM public.ves_layers
    WHERE transaction_id = transaction_record.id;

    -- Only create layer if it doesn't exist
    IF existing_layers = 0 THEN
      -- Create VES layer for this transaction
      INSERT INTO public.ves_layers (
        id,
        bank_account_id,
        transaction_id,
        amount_ves,
        remaining_ves,
        exchange_rate,
        is_active,
        created_at,
        updated_at,
        user_id
      )
      SELECT
        gen_random_uuid()::text,
        transaction_record.to_bank_account_id,
        transaction_record.id,
        transaction_record.amount,
        transaction_record.amount, -- Initially, remaining = total
        COALESCE(transaction_record.exchange_rate, 1), -- Use 1 if no rate
        true,
        transaction_record.created_at,
        transaction_record.created_at,
        t.user_id
      FROM public.transactions t
      WHERE t.id = transaction_record.id;

      layer_count := 1;

      RETURN QUERY SELECT
        transaction_record.id,
        transaction_record.to_bank_account_id,
        layer_count,
        'Created layer for ' || transaction_record.transaction_type || ' transaction';
    ELSE
      RETURN QUERY SELECT
        transaction_record.id,
        transaction_record.to_bank_account_id,
        0,
        'Layer already exists, skipped';
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Execute the retroactive creation
SELECT * FROM create_retroactive_ves_layers();

-- Update account historical costs based on layers
UPDATE public.bank_accounts ba
SET updated_at = NOW()
WHERE ba.currency = 'VES'
  AND ba.id IN (
    SELECT DISTINCT bank_account_id
    FROM public.ves_layers
    WHERE is_active = true
  );

-- Verify results
SELECT
  ba.bank,
  ba.account_number,
  ba.amount as current_balance_ves,
  COUNT(vl.id) as total_layers,
  COUNT(CASE WHEN vl.is_active THEN 1 END) as active_layers,
  SUM(CASE WHEN vl.is_active THEN vl.remaining_ves ELSE 0 END) as total_layer_ves,
  SUM(CASE WHEN vl.is_active THEN vl.remaining_ves / NULLIF(vl.exchange_rate, 0) ELSE 0 END) as historical_cost_usd
FROM public.bank_accounts ba
LEFT JOIN public.ves_layers vl ON vl.bank_account_id = ba.id
WHERE ba.currency = 'VES'
GROUP BY ba.id, ba.bank, ba.account_number, ba.amount
ORDER BY ba.bank;

COMMENT ON FUNCTION create_retroactive_ves_layers IS 'Creates VES layers retroactively from existing transactions that dont have layers yet';
