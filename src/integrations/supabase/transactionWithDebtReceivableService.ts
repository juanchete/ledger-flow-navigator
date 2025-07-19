import { supabase } from "./client";
import { v4 as uuidv4 } from "uuid";
import type { TablesInsert } from "./types";

interface TransactionWithDebtReceivableData {
  transaction: TablesInsert<"transactions">;
  createDebtReceivable: boolean;
  debtReceivableData?: {
    dueDate: string;
    interestRate: number;
    notes: string;
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
  const shouldCreateDebt = ["purchase", "expense"].includes(transaction.type);
  const shouldCreateReceivable = ["sale", "ingreso", "cash"].includes(transaction.type);

  if (!shouldCreateDebt && !shouldCreateReceivable) {
    return transactionResult;
  }

  try {
    if (shouldCreateDebt) {
      // Create debt
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
      // Create receivable
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