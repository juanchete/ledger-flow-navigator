import { supabase } from "./client";
import type { Tables, TablesInsert, TablesUpdate } from "./types";

// Types from Supabase
export type TransactionTransfer = Tables<"transaction_transfers">;
export type NewTransactionTransfer = TablesInsert<"transaction_transfers">;
export type UpdatedTransactionTransfer = TablesUpdate<"transaction_transfers">;

// Extended interface with bank account info
export interface ITransactionTransferWithAccount extends TransactionTransfer {
  bank_accounts?: {
    bank: string;
    account_number: string;
    currency: string;
  } | null;
}

// Interface for creating transfers with optional file
export interface ITransferWithReceipt extends Omit<NewTransactionTransfer, 'id'> {
  receiptFile?: File | null;
}

const TRANSFERS_TABLE = "transaction_transfers";

/**
 * Obtiene todas las transferencias de una transacción con datos de cuenta bancaria.
 */
export const getTransfersByTransactionId = async (
  transactionId: string
): Promise<ITransactionTransferWithAccount[]> => {
  const { data, error } = await supabase
    .from(TRANSFERS_TABLE)
    .select("*, bank_accounts(bank, account_number, currency)")
    .eq("transaction_id", transactionId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching transfers:", error);
    throw error;
  }
  return data || [];
};

/**
 * Crea múltiples transferencias para una transacción.
 * Los saldos de cuentas se actualizan automáticamente via trigger.
 */
export const createTransfers = async (
  transfers: NewTransactionTransfer[]
): Promise<TransactionTransfer[]> => {
  if (transfers.length === 0) return [];

  const transfersWithDefaults = transfers.map((t, index) => ({
    ...t,
    order_index: t.order_index ?? index,
  }));

  const { data, error } = await supabase
    .from(TRANSFERS_TABLE)
    .insert(transfersWithDefaults)
    .select();

  if (error) {
    console.error("Error creating transfers:", error);
    throw error;
  }
  return data || [];
};

/**
 * Actualiza una transferencia individual.
 */
export const updateTransfer = async (
  id: string,
  updates: UpdatedTransactionTransfer
): Promise<TransactionTransfer> => {
  const { data, error } = await supabase
    .from(TRANSFERS_TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating transfer:", error);
    throw error;
  }
  return data;
};

/**
 * Elimina una transferencia individual.
 * El saldo de la cuenta se revierte automáticamente via trigger.
 */
export const deleteTransfer = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(TRANSFERS_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting transfer:", error);
    throw error;
  }
};

/**
 * Elimina todas las transferencias de una transacción.
 * Los saldos se revierten automáticamente via triggers.
 */
export const deleteTransfersByTransactionId = async (
  transactionId: string
): Promise<void> => {
  const { error } = await supabase
    .from(TRANSFERS_TABLE)
    .delete()
    .eq("transaction_id", transactionId);

  if (error) {
    console.error("Error deleting transfers:", error);
    throw error;
  }
};

/**
 * Valida que la suma de transferencias sea igual al monto total.
 * @returns Objeto con validación y diferencia
 */
export const validateTransferAmounts = (
  transfers: Array<{ amount: number }>,
  totalAmount: number
): { valid: boolean; difference: number; sum: number } => {
  const sum = transfers.reduce((acc, t) => acc + (t.amount || 0), 0);
  const difference = Math.abs(totalAmount - sum);
  return {
    valid: difference < 0.01, // Tolerancia para errores de punto flotante
    difference,
    sum,
  };
};

/**
 * Sube un comprobante para una transferencia y actualiza el registro.
 */
export const uploadTransferReceipt = async (
  file: File,
  transferId: string
): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `transfer-receipts/${transferId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("receipts")
    .upload(fileName, file);

  if (error) {
    console.error("Error uploading receipt:", error);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from("receipts")
    .getPublicUrl(fileName);

  // Actualizar el registro de la transferencia con la URL
  await updateTransfer(transferId, { receipt_url: urlData.publicUrl });

  return urlData.publicUrl;
};

/**
 * Obtiene todas las transferencias para múltiples transacciones.
 * Útil para cargar datos en lotes.
 */
export const getTransfersByTransactionIds = async (
  transactionIds: string[]
): Promise<ITransactionTransferWithAccount[]> => {
  if (transactionIds.length === 0) return [];

  const { data, error } = await supabase
    .from(TRANSFERS_TABLE)
    .select("*, bank_accounts(bank, account_number, currency)")
    .in("transaction_id", transactionIds)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching transfers:", error);
    throw error;
  }
  return data || [];
};

/**
 * Obtiene transferencias por cuenta bancaria.
 * Útil para ver el historial de una cuenta.
 */
export const getTransfersByBankAccountId = async (
  bankAccountId: string
): Promise<TransactionTransfer[]> => {
  const { data, error } = await supabase
    .from(TRANSFERS_TABLE)
    .select("*")
    .eq("bank_account_id", bankAccountId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transfers by bank account:", error);
    throw error;
  }
  return data || [];
};
