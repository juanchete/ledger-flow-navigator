/**
 * VES Layer Service
 *
 * Handles FIFO (First In, First Out) tracking for VES (Venezuelan Bol
ívares) balances
 * in bank accounts. Each "layer" represents VES that entered at a specific exchange rate,
 * allowing accurate calculation of net worth based on historical cost.
 *
 * Core Concepts:
 * - When VES enters an account, we create a "layer" recording the amount and exchange rate
 * - When VES exits, we consume layers in FIFO order (oldest first)
 * - This allows us to track the USD cost basis of VES holdings
 *
 * Example:
 * Day 1: Sell $100 at rate 50 → Create layer: 5000 VES = $100 USD cost
 * Day 2: Sell $100 at rate 60 → Create layer: 6000 VES = $100 USD cost
 * Day 3: Use 7000 VES to buy $140 → Consume: 5000 VES ($100) + 2000 VES ($33.33) = $133.33 cost
 *        Gain: $140 - $133.33 = $6.67 USD
 */

import { supabase } from "./client";
import { nanoid } from "nanoid";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * VES Layer represents a "batch" of VES that entered at a specific rate
 */
export interface IVESLayer {
  id: string;
  bank_account_id: string;
  transaction_id: string | null;
  amount_ves: number;              // Original VES amount
  remaining_ves: number;            // VES still available (FIFO)
  exchange_rate: number;            // VES per USD at time of entry
  equivalent_usd: number;           // USD equivalent (amount_ves / rate)
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export interface IVESLayerInsert {
  id?: string;
  bank_account_id: string;
  transaction_id?: string | null;
  amount_ves: number;
  remaining_ves?: number;  // Defaults to amount_ves
  exchange_rate: number;
  equivalent_usd?: number;  // Auto-calculated if not provided
  user_id?: string | null;
}

export interface IVESLayerUpdate {
  remaining_ves?: number;
  updated_at?: string;
}

/**
 * Result of consuming VES layers in FIFO order
 */
export interface IVESConsumptionResult {
  total_ves_consumed: number;
  total_usd_cost: number;              // Historical USD cost of consumed VES
  layers_consumed: IConsumedLayer[];    // Details of each layer consumed
  gain_or_loss_usd?: number;           // Optional: gain/loss if we know sale price
}

/**
 * Details about a single layer consumed
 */
export interface IConsumedLayer {
  layer_id: string;
  ves_consumed: number;
  usd_cost: number;
  exchange_rate: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VES_LAYERS_TABLE = "bank_account_ves_layers";
const BANK_ACCOUNTS_TABLE = "bank_accounts";

// ============================================================================
// CORE LAYER OPERATIONS
// ============================================================================

/**
 * Creates a new VES layer when VES enters an account
 *
 * @param layer - Layer data including amount, rate, and account
 * @returns The created layer
 *
 * @example
 * // User sells $100 at rate 50, receives 5000 VES
 * const layer = await createVESLayer({
 *   bank_account_id: "account123",
 *   transaction_id: "tx456",
 *   amount_ves: 5000,
 *   exchange_rate: 50,
 *   user_id: "user789"
 * });
 */
export const createVESLayer = async (
  layer: IVESLayerInsert
): Promise<IVESLayer> => {
  try {
    // Generate ID if not provided
    const id = layer.id || nanoid();

    // Calculate equivalent USD if not provided
    const equivalent_usd =
      layer.equivalent_usd !== undefined
        ? layer.equivalent_usd
        : layer.amount_ves / layer.exchange_rate;

    // Default remaining_ves to amount_ves
    const remaining_ves = layer.remaining_ves ?? layer.amount_ves;

    const layerData: IVESLayerInsert & { id: string } = {
      ...layer,
      id,
      remaining_ves,
      equivalent_usd,
    };

    const { data, error } = await supabase
      .from(VES_LAYERS_TABLE)
      .insert(layerData)
      .select()
      .single();

    if (error) {
      console.error("Error creating VES layer:", error);
      throw error;
    }

    console.log(`Created VES layer: ${data.id} - ${data.amount_ves} VES @ rate ${data.exchange_rate} = $${data.equivalent_usd.toFixed(2)} USD`);

    return data;
  } catch (error) {
    console.error("Error in createVESLayer:", error);
    throw error;
  }
};

/**
 * Consumes VES layers in FIFO order when VES exits an account
 *
 * This function:
 * 1. Gets all available layers for the account (ordered by creation date)
 * 2. Consumes them in FIFO order until we've consumed the requested amount
 * 3. Updates each layer's remaining_ves
 * 4. Returns details of consumption including USD cost basis
 *
 * @param bank_account_id - Account to consume layers from
 * @param amount_ves - Amount of VES to consume
 * @returns Consumption result with USD cost and details
 *
 * @example
 * // User buys $140 with 7000 VES
 * const result = await consumeVESLayers("account123", 7000);
 * // result.total_usd_cost = 133.33 (historical cost)
 * // Gain = 140 - 133.33 = 6.67 USD
 */
export const consumeVESLayers = async (
  bank_account_id: string,
  amount_ves: number
): Promise<IVESConsumptionResult> => {
  try {
    // Get available layers in FIFO order (oldest first)
    const { data: layers, error: fetchError } = await supabase
      .from(VES_LAYERS_TABLE)
      .select("*")
      .eq("bank_account_id", bank_account_id)
      .gt("remaining_ves", 0)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching VES layers:", fetchError);
      throw fetchError;
    }

    if (!layers || layers.length === 0) {
      throw new Error(
        `No VES layers available for account ${bank_account_id}`
      );
    }

    // Check if we have enough VES
    const total_available = layers.reduce(
      (sum, layer) => sum + layer.remaining_ves,
      0
    );

    if (total_available < amount_ves) {
      throw new Error(
        `Insufficient VES in layers. Requested: ${amount_ves}, Available: ${total_available}`
      );
    }

    // Consume layers in FIFO order
    let remaining_to_consume = amount_ves;
    const consumed_layers: IConsumedLayer[] = [];
    let total_usd_cost = 0;

    for (const layer of layers) {
      if (remaining_to_consume <= 0) break;

      // How much can we consume from this layer?
      const consume_from_this_layer = Math.min(
        layer.remaining_ves,
        remaining_to_consume
      );

      // Calculate USD cost for this portion
      const usd_cost_this_layer = consume_from_this_layer / layer.exchange_rate;

      // Update the layer
      const new_remaining = layer.remaining_ves - consume_from_this_layer;

      const { error: updateError } = await supabase
        .from(VES_LAYERS_TABLE)
        .update({
          remaining_ves: new_remaining,
          updated_at: new Date().toISOString(),
        })
        .eq("id", layer.id);

      if (updateError) {
        console.error(`Error updating layer ${layer.id}:`, updateError);
        throw updateError;
      }

      // Record consumption
      consumed_layers.push({
        layer_id: layer.id,
        ves_consumed: consume_from_this_layer,
        usd_cost: usd_cost_this_layer,
        exchange_rate: layer.exchange_rate,
      });

      total_usd_cost += usd_cost_this_layer;
      remaining_to_consume -= consume_from_this_layer;

      console.log(
        `Consumed ${consume_from_this_layer} VES from layer ${layer.id} @ rate ${layer.exchange_rate} = $${usd_cost_this_layer.toFixed(2)} USD (remaining in layer: ${new_remaining})`
      );
    }

    const result: IVESConsumptionResult = {
      total_ves_consumed: amount_ves,
      total_usd_cost,
      layers_consumed: consumed_layers,
    };

    console.log(
      `Total VES consumed: ${amount_ves}, Total USD cost: $${total_usd_cost.toFixed(2)}`
    );

    return result;
  } catch (error) {
    console.error("Error in consumeVESLayers:", error);
    throw error;
  }
};

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * Gets all VES layers for a specific bank account
 *
 * @param bank_account_id - Account to get layers for
 * @param only_active - If true, only return layers with remaining_ves > 0
 * @returns Array of VES layers
 */
export const getVESLayersByAccount = async (
  bank_account_id: string,
  only_active = true
): Promise<IVESLayer[]> => {
  try {
    let query = supabase
      .from(VES_LAYERS_TABLE)
      .select("*")
      .eq("bank_account_id", bank_account_id)
      .order("created_at", { ascending: true });

    if (only_active) {
      query = query.gt("remaining_ves", 0);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching VES layers:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getVESLayersByAccount:", error);
    throw error;
  }
};

/**
 * Gets a single VES layer by ID
 *
 * @param layer_id - Layer ID to fetch
 * @returns The VES layer or null if not found
 */
export const getVESLayerById = async (
  layer_id: string
): Promise<IVESLayer | null> => {
  try {
    const { data, error } = await supabase
      .from(VES_LAYERS_TABLE)
      .select("*")
      .eq("id", layer_id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      console.error(`Error fetching VES layer ${layer_id}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in getVESLayerById:", error);
    throw error;
  }
};

/**
 * Calculates the historical cost in USD for all VES layers in an account
 *
 * This is used to calculate net worth correctly: instead of converting
 * VES to USD at current rate, we use the historical cost (how many USD
 * those VES originally represented when they entered the account).
 *
 * @param bank_account_id - Account to calculate for
 * @returns Total historical USD cost
 *
 * @example
 * // Account has two layers:
 * // Layer 1: 5000 VES @ rate 50 = $100 USD cost
 * // Layer 2: 6000 VES @ rate 60 = $100 USD cost
 * const historical_cost = await getAccountHistoricalCostUSD("account123");
 * // Returns: 200 USD (not current market value)
 */
export const getAccountHistoricalCostUSD = async (
  bank_account_id: string
): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from(VES_LAYERS_TABLE)
      .select("remaining_ves, exchange_rate")
      .eq("bank_account_id", bank_account_id)
      .gt("remaining_ves", 0);

    if (error) {
      console.error("Error calculating historical cost:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    // Sum up: (remaining_ves / exchange_rate) for each layer
    const total_usd = data.reduce((sum, layer) => {
      return sum + layer.remaining_ves / layer.exchange_rate;
    }, 0);

    return total_usd;
  } catch (error) {
    console.error("Error in getAccountHistoricalCostUSD:", error);
    throw error;
  }
};

/**
 * Gets all VES layers for a specific user
 *
 * @param user_id - User ID to get layers for
 * @param only_active - If true, only return layers with remaining_ves > 0
 * @returns Array of VES layers
 */
export const getVESLayersByUser = async (
  user_id: string,
  only_active = true
): Promise<IVESLayer[]> => {
  try {
    let query = supabase
      .from(VES_LAYERS_TABLE)
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true });

    if (only_active) {
      query = query.gt("remaining_ves", 0);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching VES layers by user:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getVESLayersByUser:", error);
    throw error;
  }
};

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Deletes a VES layer (use with caution - should only be used for cleanup)
 *
 * @param layer_id - Layer to delete
 */
export const deleteVESLayer = async (layer_id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(VES_LAYERS_TABLE)
      .delete()
      .eq("id", layer_id);

    if (error) {
      console.error(`Error deleting VES layer ${layer_id}:`, error);
      throw error;
    }

    console.log(`Deleted VES layer: ${layer_id}`);
  } catch (error) {
    console.error("Error in deleteVESLayer:", error);
    throw error;
  }
};

/**
 * Gets summary statistics for a bank account's VES layers
 *
 * @param bank_account_id - Account to get stats for
 * @returns Summary statistics
 */
export interface IVESLayerSummary {
  total_layers: number;
  active_layers: number;
  total_ves_original: number;
  total_ves_remaining: number;
  total_usd_historical_cost: number;
  average_exchange_rate: number;
  oldest_layer_date: string | null;
  newest_layer_date: string | null;
}

export const getVESLayerSummary = async (
  bank_account_id: string
): Promise<IVESLayerSummary> => {
  try {
    const { data: layers, error } = await supabase
      .from(VES_LAYERS_TABLE)
      .select("*")
      .eq("bank_account_id", bank_account_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching layers for summary:", error);
      throw error;
    }

    if (!layers || layers.length === 0) {
      return {
        total_layers: 0,
        active_layers: 0,
        total_ves_original: 0,
        total_ves_remaining: 0,
        total_usd_historical_cost: 0,
        average_exchange_rate: 0,
        oldest_layer_date: null,
        newest_layer_date: null,
      };
    }

    const active_layers = layers.filter((l) => l.remaining_ves > 0);
    const total_ves_original = layers.reduce((sum, l) => sum + l.amount_ves, 0);
    const total_ves_remaining = layers.reduce(
      (sum, l) => sum + l.remaining_ves,
      0
    );
    const total_usd_historical_cost = active_layers.reduce(
      (sum, l) => sum + l.remaining_ves / l.exchange_rate,
      0
    );

    // Weighted average exchange rate based on remaining VES
    const average_exchange_rate =
      total_ves_remaining > 0
        ? total_ves_remaining / total_usd_historical_cost
        : 0;

    return {
      total_layers: layers.length,
      active_layers: active_layers.length,
      total_ves_original,
      total_ves_remaining,
      total_usd_historical_cost,
      average_exchange_rate,
      oldest_layer_date: layers[0]?.created_at || null,
      newest_layer_date: layers[layers.length - 1]?.created_at || null,
    };
  } catch (error) {
    console.error("Error in getVESLayerSummary:", error);
    throw error;
  }
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  createVESLayer,
  consumeVESLayers,
  getVESLayersByAccount,
  getVESLayerById,
  getAccountHistoricalCostUSD,
  getVESLayersByUser,
  deleteVESLayer,
  getVESLayerSummary,
};
