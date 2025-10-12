-- EJECUTAR ESTE SCRIPT EN SUPABASE SQL EDITOR
-- Para crear capas VES faltantes retroactivamente

-- Paso 1: Ver el estado actual
SELECT
  'Estado Actual' as paso,
  ba.bank,
  ba.account_number,
  ba.amount as balance_ves,
  COUNT(vl.id) as capas_existentes,
  SUM(CASE WHEN vl.is_active THEN vl.remaining_ves ELSE 0 END) as ves_en_capas
FROM public.bank_accounts ba
LEFT JOIN public.ves_layers vl ON vl.bank_account_id = ba.id AND vl.is_active = true
WHERE ba.currency = 'VES'
GROUP BY ba.id, ba.bank, ba.account_number, ba.amount;

-- Paso 2: Encontrar transacciones VES sin capas
SELECT
  'Transacciones sin capas' as paso,
  t.id as transaction_id,
  t.transaction_type,
  t.amount,
  t.exchange_rate,
  t.created_at,
  ba.bank,
  ba.account_number
FROM public.transactions t
JOIN public.bank_accounts ba ON ba.id = t.to_bank_account_id
LEFT JOIN public.ves_layers vl ON vl.transaction_id = t.id
WHERE ba.currency = 'VES'
  AND t.to_bank_account_id IS NOT NULL
  AND t.amount > 0
  AND t.transaction_type IN ('sale', 'cash', 'balance-change')
  AND vl.id IS NULL
ORDER BY t.created_at ASC;

-- Paso 3: Crear capas faltantes manualmente
-- IMPORTANTE: Esto creará una capa por cada transacción VES que no tenga capa

DO $$
DECLARE
  trans RECORD;
  new_layer_id TEXT;
BEGIN
  FOR trans IN
    SELECT
      t.id as transaction_id,
      t.to_bank_account_id,
      t.amount,
      COALESCE(t.exchange_rate, 200.0) as exchange_rate, -- Tasa por defecto 200 si no existe
      t.created_at,
      t.user_id
    FROM public.transactions t
    JOIN public.bank_accounts ba ON ba.id = t.to_bank_account_id
    LEFT JOIN public.ves_layers vl ON vl.transaction_id = t.id
    WHERE ba.currency = 'VES'
      AND t.to_bank_account_id IS NOT NULL
      AND t.amount > 0
      AND t.transaction_type IN ('sale', 'cash', 'balance-change')
      AND vl.id IS NULL
    ORDER BY t.created_at ASC
  LOOP
    -- Generar ID para la nueva capa
    new_layer_id := gen_random_uuid()::text;

    -- Crear la capa
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
    ) VALUES (
      new_layer_id,
      trans.to_bank_account_id,
      trans.transaction_id,
      trans.amount,
      trans.amount, -- Inicialmente remaining = amount
      trans.exchange_rate,
      true,
      trans.created_at,
      trans.created_at,
      trans.user_id
    );

    RAISE NOTICE 'Capa creada: % para transacción %', new_layer_id, trans.transaction_id;
  END LOOP;
END $$;

-- Paso 4: Verificar el resultado
SELECT
  'Resultado Final' as paso,
  ba.bank,
  ba.account_number,
  ba.amount as balance_ves,
  COUNT(vl.id) as total_capas,
  COUNT(CASE WHEN vl.is_active THEN 1 END) as capas_activas,
  SUM(CASE WHEN vl.is_active THEN vl.remaining_ves ELSE 0 END) as ves_en_capas_activas,
  SUM(CASE WHEN vl.is_active THEN vl.remaining_ves / NULLIF(vl.exchange_rate, 0) ELSE 0 END) as costo_historico_usd
FROM public.bank_accounts ba
LEFT JOIN public.ves_layers vl ON vl.bank_account_id = ba.id
WHERE ba.currency = 'VES'
GROUP BY ba.id, ba.bank, ba.account_number, ba.amount
ORDER BY ba.bank;

-- Paso 5: Ver todas las capas creadas para BDV PERSONAL
SELECT
  'Capas BDV PERSONAL' as paso,
  vl.id,
  vl.amount_ves,
  vl.remaining_ves,
  vl.exchange_rate,
  vl.is_active,
  vl.created_at,
  t.transaction_type,
  t.description
FROM public.ves_layers vl
JOIN public.bank_accounts ba ON ba.id = vl.bank_account_id
LEFT JOIN public.transactions t ON t.id = vl.transaction_id
WHERE ba.bank LIKE '%BDV%'
  AND ba.account_number LIKE '%4590'
ORDER BY vl.created_at ASC;
