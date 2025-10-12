-- SCRIPT COMPLETO PARA CREAR SISTEMA DE CAPAS VES FIFO
-- EJECUTAR TODO ESTE SCRIPT EN SUPABASE SQL EDITOR

-- ============================================================================
-- 1. CREAR TABLA DE CAPAS VES
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
    user_id UUID,
    is_active BOOLEAN DEFAULT true,

    -- Foreign Keys
    CONSTRAINT fk_ves_layer_bank_account
        FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_ves_layer_transaction
        FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL,
    CONSTRAINT fk_ves_layer_user
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Validación
    CONSTRAINT chk_remaining_ves_valid
        CHECK (remaining_ves <= amount_ves)
);

-- Comentarios
COMMENT ON TABLE public.bank_account_ves_layers IS 'FIFO layers for tracking VES balances with historical exchange rates';
COMMENT ON COLUMN public.bank_account_ves_layers.amount_ves IS 'Original VES amount when layer was created';
COMMENT ON COLUMN public.bank_account_ves_layers.remaining_ves IS 'VES still available in this layer (FIFO consumption)';
COMMENT ON COLUMN public.bank_account_ves_layers.exchange_rate IS 'Exchange rate when VES entered (VES per USD)';
COMMENT ON COLUMN public.bank_account_ves_layers.equivalent_usd IS 'USD equivalent at time of entry (amount_ves / exchange_rate)';

-- ============================================================================
-- 2. AGREGAR CAMPO DE COSTO HISTÓRICO A BANK_ACCOUNTS
-- ============================================================================

ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS historical_cost_usd DECIMAL(18,2) DEFAULT 0;

COMMENT ON COLUMN public.bank_accounts.historical_cost_usd IS 'Sum of USD equivalents from all VES layers (for VES accounts only)';

-- ============================================================================
-- 3. CREAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_ves_layers_fifo
    ON public.bank_account_ves_layers(bank_account_id, created_at, remaining_ves)
    WHERE remaining_ves > 0;

-- ============================================================================
-- 4. CREAR CAPAS DESDE TRANSACCIONES EXISTENTES
-- ============================================================================

-- Crear capas para todas las transacciones VES que agregaron dinero
DO $$
DECLARE
  trans RECORD;
  new_layer_id TEXT;
  rate DECIMAL(10,6);
BEGIN
  RAISE NOTICE 'Iniciando creación de capas VES desde transacciones existentes...';

  FOR trans IN
    SELECT
      t.id as transaction_id,
      t.to_bank_account_id,
      t.amount,
      t.exchange_rate,
      t.created_at,
      t.user_id,
      ba.currency,
      ba.bank,
      ba.account_number
    FROM public.transactions t
    JOIN public.bank_accounts ba ON ba.id = t.to_bank_account_id
    WHERE ba.currency = 'VES'
      AND t.to_bank_account_id IS NOT NULL
      AND t.amount > 0
      AND t.transaction_type IN ('sale', 'cash', 'balance-change', 'ingreso', 'payment')
    ORDER BY t.created_at ASC
  LOOP
    -- Verificar si ya existe capa para esta transacción
    IF EXISTS (SELECT 1 FROM public.bank_account_ves_layers WHERE transaction_id = trans.transaction_id) THEN
      RAISE NOTICE 'Capa ya existe para transacción %, saltando...', trans.transaction_id;
      CONTINUE;
    END IF;

    -- Determinar tasa de cambio
    rate := COALESCE(trans.exchange_rate, 200.0); -- Tasa por defecto 200 si no existe

    -- Generar ID para la capa
    new_layer_id := gen_random_uuid()::text;

    -- Crear la capa
    INSERT INTO public.bank_account_ves_layers (
      id,
      bank_account_id,
      transaction_id,
      amount_ves,
      remaining_ves,
      exchange_rate,
      equivalent_usd,
      is_active,
      created_at,
      updated_at,
      user_id
    ) VALUES (
      new_layer_id,
      trans.to_bank_account_id,
      trans.transaction_id,
      trans.amount,
      trans.amount,
      rate,
      trans.amount / rate,
      true,
      trans.created_at,
      trans.created_at,
      trans.user_id
    );

    RAISE NOTICE 'Capa creada: % - %.2f VES @ tasa %.2f = $%.2f USD para cuenta % %',
      new_layer_id, trans.amount, rate, (trans.amount / rate), trans.bank, trans.account_number;
  END LOOP;

  RAISE NOTICE 'Creación de capas completada.';
END $$;

-- ============================================================================
-- 5. ACTUALIZAR COSTOS HISTÓRICOS EN BANK_ACCOUNTS
-- ============================================================================

UPDATE public.bank_accounts ba
SET historical_cost_usd = (
  SELECT COALESCE(SUM(remaining_ves / NULLIF(exchange_rate, 0)), 0)
  FROM public.bank_account_ves_layers
  WHERE bank_account_id = ba.id
    AND is_active = true
    AND remaining_ves > 0
)
WHERE ba.currency = 'VES';

-- ============================================================================
-- 6. VERIFICAR RESULTADOS
-- ============================================================================

-- Ver resumen por cuenta
SELECT
  'RESUMEN POR CUENTA' as reporte,
  ba.bank,
  ba.account_number,
  ba.amount as balance_actual_ves,
  COUNT(vl.id) as total_capas,
  COUNT(CASE WHEN vl.is_active AND vl.remaining_ves > 0 THEN 1 END) as capas_activas,
  SUM(CASE WHEN vl.is_active THEN vl.remaining_ves ELSE 0 END) as total_ves_en_capas,
  SUM(CASE WHEN vl.is_active AND vl.remaining_ves > 0 THEN vl.remaining_ves / NULLIF(vl.exchange_rate, 0) ELSE 0 END) as costo_historico_usd,
  ba.historical_cost_usd as costo_en_tabla
FROM public.bank_accounts ba
LEFT JOIN public.bank_account_ves_layers vl ON vl.bank_account_id = ba.id
WHERE ba.currency = 'VES'
GROUP BY ba.id, ba.bank, ba.account_number, ba.amount, ba.historical_cost_usd
ORDER BY ba.bank;

-- Ver capas de BDV PERSONAL específicamente
SELECT
  'CAPAS BDV PERSONAL' as reporte,
  vl.id,
  vl.amount_ves as ves_original,
  vl.remaining_ves as ves_restante,
  vl.exchange_rate as tasa,
  (vl.remaining_ves / NULLIF(vl.exchange_rate, 0)) as costo_usd,
  vl.is_active,
  vl.created_at,
  t.transaction_type,
  t.description
FROM public.bank_account_ves_layers vl
JOIN public.bank_accounts ba ON ba.id = vl.bank_account_id
LEFT JOIN public.transactions t ON t.id = vl.transaction_id
WHERE ba.bank LIKE '%BDV%'
  AND ba.account_number LIKE '%4590'
ORDER BY vl.created_at ASC;

-- ============================================================================
-- 7. PERMISOS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_account_ves_layers TO authenticated;

-- ============================================================================
-- FINALIZADO
-- ============================================================================
SELECT 'SCRIPT COMPLETADO EXITOSAMENTE' as status;
