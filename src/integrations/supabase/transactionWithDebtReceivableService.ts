import { supabase } from "./client";
import { v4 as uuidv4 } from "uuid";
import type { TablesInsert } from "./types";
import { ExchangeRateDB } from "./exchangeRateService";

interface TransactionWithDebtReceivableData {
  transaction: TablesInsert<"transactions">;
  createDebtReceivable: boolean;
  debtReceivableData?: {
    dueDate: string;
    interestRate: number;
    notes: string;
  };
}

interface IAmountUsdCalculation {
  amountUsd: number;
  exchangeRate: number | null;
  exchangeRateId: number | null;
}

async function calculateAmountUsd(
  amount: number,
  currency: string | null,
  customExchangeRate: number | null,
  exchangeRateId: number | null
): Promise<IAmountUsdCalculation> {
  if (currency === 'USD' || currency === null) {
    return {
      amountUsd: amount,
      exchangeRate: null,
      exchangeRateId: null,
    };
  }

  if (currency === 'VES') {
    let exchangeRate: number | null = null;

    if (customExchangeRate) {
      exchangeRate = customExchangeRate;
      return {
        amountUsd: amount / exchangeRate,
        exchangeRate,
        exchangeRateId: null,
      };
    }

    if (exchangeRateId) {
      const { data: rateData, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('id', exchangeRateId)
        .single();

      if (error || !rateData) {
        console.error('Error fetching exchange rate:', error);
        exchangeRate = 1;
      } else {
        exchangeRate = rateData.rate;
      }

      return {
        amountUsd: amount / exchangeRate,
        exchangeRate,
        exchangeRateId,
      };
    }

    console.warn('VES transaction without exchange rate, defaulting to 1:1');
    return {
      amountUsd: amount,
      exchangeRate: null,
      exchangeRateId: null,
    };
  }

  return {
    amountUsd: amount,
    exchangeRate: null,
    exchangeRateId: null,
  };
}

/**
 * Creates a transaction and optionally creates an associated debt or receivable
 * @param data The transaction data and optional debt/receivable information
 * @returns The created transaction
 */
export async function createTransactionWithDebtReceivable(data: TransactionWithDebtReceivableData) {
  const { transaction, createDebtReceivable, debtReceivableData } = data;

  // Start a transaction
  const { data: transactionResult, error: transactionError } = await supabase
    .from("transactions")
    .insert(transaction)
    .select()
    .single();

  if (transactionError) {
    console.error("Error creating transaction:", transactionError);
    throw transactionError;
  }

  if (!createDebtReceivable || !debtReceivableData) {
    return transactionResult;
  }

  // Determine whether to create a debt or receivable based on transaction type
  // For sales: create debt (money received that needs to be paid to someone)
  // For purchases: create receivable (money spent that will be reimbursed)
  // For expenses: can also create debt if needed
  const shouldCreateDebt = ["sale", "expense"].includes(transaction.type);
  const shouldCreateReceivable = ["purchase"].includes(transaction.type);

  if (!shouldCreateDebt && !shouldCreateReceivable) {
    return transactionResult;
  }

  try {
    if (shouldCreateDebt) {
      const usdCalculation = await calculateAmountUsd(
        transaction.amount,
        transaction.currency,
        transaction.custom_exchange_rate,
        transaction.exchange_rate_id
      );

      const debtData: TablesInsert<"debts"> = {
        id: uuidv4(),
        creditor: transaction.description || "N/A",
        amount: transaction.amount,
        due_date: debtReceivableData.dueDate,
        status: "pending",
        category: transaction.category || "general",
        notes: debtReceivableData.notes || null,
        client_id: transaction.client_id,
        interest_rate: debtReceivableData.interestRate || null,
        commission: transaction.commission || null,
        currency: transaction.currency,
        installments: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        amount_usd: usdCalculation.amountUsd,
        exchange_rate: usdCalculation.exchangeRate,
        exchange_rate_id: usdCalculation.exchangeRateId,
        remaining_amount_usd: usdCalculation.amountUsd,
      };

      const { error: debtError } = await supabase
        .from("debts")
        .insert(debtData);

      if (debtError) {
        console.error("Error creating debt:", debtError);
        // Note: We don't rollback the transaction here as Supabase doesn't support 
        // database-level transactions in the client SDK. You might want to handle this 
        // differently in production (e.g., using a server-side function)
      } else {
        // Update the transaction to link it to the debt
        await supabase
          .from("transactions")
          .update({ debt_id: debtData.id })
          .eq("id", transactionResult.id);
      }
    } else if (shouldCreateReceivable) {
      const usdCalculation = await calculateAmountUsd(
        transaction.amount,
        transaction.currency,
        transaction.custom_exchange_rate,
        transaction.exchange_rate_id
      );

      const receivableData: TablesInsert<"receivables"> = {
        id: uuidv4(),
        client_id: transaction.client_id || "",
        amount: transaction.amount,
        due_date: debtReceivableData.dueDate,
        status: "pending",
        description: transaction.description || "",
        notes: debtReceivableData.notes || null,
        interest_rate: debtReceivableData.interestRate || null,
        commission: transaction.commission || null,
        currency: transaction.currency,
        installments: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        amount_usd: usdCalculation.amountUsd,
        exchange_rate: usdCalculation.exchangeRate,
        exchange_rate_id: usdCalculation.exchangeRateId,
        remaining_amount_usd: usdCalculation.amountUsd,
      };

      const { error: receivableError } = await supabase
        .from("receivables")
        .insert(receivableData);

      if (receivableError) {
        console.error("Error creating receivable:", receivableError);
      } else {
        // Update the transaction to link it to the receivable
        await supabase
          .from("transactions")
          .update({ receivable_id: receivableData.id })
          .eq("id", transactionResult.id);
      }
    }
  } catch (error) {
    console.error("Error in debt/receivable creation:", error);
    // Transaction was created successfully, so we return it even if debt/receivable failed
  }

  return transactionResult;
}