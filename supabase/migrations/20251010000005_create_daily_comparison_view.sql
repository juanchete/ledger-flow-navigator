-- Migration: Create v_daily_comparison view
-- Description: Vista que compara el estado actual de las cuentas bancarias con el snapshot más reciente

CREATE OR REPLACE VIEW public.v_daily_comparison AS
SELECT
  ba.user_id,
  ba.id as bank_account_id,
  ba.bank,
  ba.account_number,
  ba.currency,

  -- Estado actual
  ba.amount as current_amount,
  COALESCE(ba.historical_cost_usd, 0) as current_historical_cost_usd,

  -- Estado previo (snapshot más reciente)
  prev.amount as previous_amount,
  prev.historical_cost_usd as previous_historical_cost_usd,
  prev.snapshot_date as comparison_date,

  -- Cambios absolutos
  (ba.amount - COALESCE(prev.amount, 0)) as amount_change,
  (COALESCE(ba.historical_cost_usd, 0) - COALESCE(prev.historical_cost_usd, 0)) as historical_cost_change,

  -- Cambios porcentuales
  CASE
    WHEN COALESCE(prev.amount, 0) = 0 THEN NULL
    ELSE ((ba.amount - prev.amount) / prev.amount * 100)
  END as amount_change_percent,

  CASE
    WHEN COALESCE(prev.historical_cost_usd, 0) = 0 THEN NULL
    ELSE ((COALESCE(ba.historical_cost_usd, 0) - prev.historical_cost_usd) / prev.historical_cost_usd * 100)
  END as historical_cost_change_percent,

  -- Dirección del cambio
  CASE
    WHEN ba.amount > COALESCE(prev.amount, 0) THEN 'increase'
    WHEN ba.amount < COALESCE(prev.amount, 0) THEN 'decrease'
    ELSE 'no_change'
  END as change_direction,

  -- Días desde el último snapshot
  CASE
    WHEN prev.snapshot_date IS NOT NULL THEN CURRENT_DATE - prev.snapshot_date
    ELSE NULL
  END as days_since_snapshot

FROM public.bank_accounts ba

-- LATERAL JOIN para obtener el snapshot más reciente de cada cuenta
LEFT JOIN LATERAL (
  SELECT
    amount,
    historical_cost_usd,
    snapshot_date
  FROM public.daily_account_snapshots
  WHERE bank_account_id = ba.id
  ORDER BY snapshot_date DESC
  LIMIT 1
) prev ON true

-- Ordenar por usuario y cuenta
ORDER BY ba.user_id, ba.bank, ba.account_number;

-- Comentario en la vista
COMMENT ON VIEW public.v_daily_comparison IS
'Vista que compara el estado actual de las cuentas bancarias con el snapshot más reciente.
Incluye cambios absolutos, porcentuales y dirección del cambio.
Usa LATERAL JOIN para eficiencia en la consulta del último snapshot por cuenta.';

-- Grant permissions
GRANT SELECT ON public.v_daily_comparison TO authenticated;
