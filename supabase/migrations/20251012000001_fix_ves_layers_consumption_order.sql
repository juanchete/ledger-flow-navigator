-- Migration: Fix consume_ves_layers_fifo to consume highest rate first
-- Date: 2025-10-12
-- Description: Change from FIFO (oldest first) to HIFO (highest rate first) for optimal cost basis

CREATE OR REPLACE FUNCTION public.consume_ves_layers_fifo(
    p_bank_account_id character varying,
    p_amount_ves numeric
)
RETURNS TABLE(consumed_usd numeric, layers_consumed integer)
LANGUAGE plpgsql
AS $function$
DECLARE
    remaining_to_consume DECIMAL(18,2) := p_amount_ves;
    layer_record RECORD;
    consumed_from_layer DECIMAL(18,2);
    total_consumed_usd DECIMAL(18,2) := 0;
    layers_count INTEGER := 0;
BEGIN
    -- ✅ FIX: Consumir capas con PEOR tasa primero (más alta) para maximizar ganancias
    -- Cambio de: ORDER BY created_at ASC (FIFO)
    -- A: ORDER BY exchange_rate DESC (Highest Rate First)
    FOR layer_record IN
        SELECT id, remaining_ves, exchange_rate
        FROM public.bank_account_ves_layers
        WHERE bank_account_id = p_bank_account_id
          AND is_active = true
          AND remaining_ves > 0
        ORDER BY exchange_rate DESC, created_at ASC  -- Peor tasa primero, luego por antigüedad
    LOOP
        EXIT WHEN remaining_to_consume <= 0;

        -- Calcular cuánto consumir de esta capa
        consumed_from_layer := LEAST(remaining_to_consume, layer_record.remaining_ves);

        -- Actualizar la capa
        UPDATE public.bank_account_ves_layers
        SET
            remaining_ves = remaining_ves - consumed_from_layer,
            updated_at = NOW()
        WHERE id = layer_record.id;

        -- Calcular el costo USD de lo consumido
        total_consumed_usd := total_consumed_usd + (consumed_from_layer / layer_record.exchange_rate);

        -- Actualizar contador
        remaining_to_consume := remaining_to_consume - consumed_from_layer;
        layers_count := layers_count + 1;

        RAISE NOTICE 'Capa % consumida: %.2f VES (de %.2f) @ tasa %.2f = $%.2f USD',
            layer_record.id, consumed_from_layer, layer_record.remaining_ves,
            layer_record.exchange_rate, (consumed_from_layer / layer_record.exchange_rate);
    END LOOP;

    -- Actualizar historical_cost_usd de la cuenta
    UPDATE public.bank_accounts
    SET historical_cost_usd = (
        SELECT COALESCE(SUM(remaining_ves / NULLIF(exchange_rate, 0)), 0)
        FROM public.bank_account_ves_layers
        WHERE bank_account_id = p_bank_account_id
          AND is_active = true
          AND remaining_ves > 0
    )
    WHERE id = p_bank_account_id;

    RETURN QUERY SELECT total_consumed_usd, layers_count;
END;
$function$;

-- Comentario sobre el fix
COMMENT ON FUNCTION public.consume_ves_layers_fifo(character varying, numeric) IS
'Consume VES layers using HIGHEST RATE FIRST strategy to minimize USD cost and maximize gains. Consumes expensive layers before cheap ones.';
