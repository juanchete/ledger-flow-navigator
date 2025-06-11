import { supabase } from "./client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "./types";
import { v4 as uuidv4 } from "uuid";

export type Receivable = Tables<"receivables">;
export type NewReceivable = TablesInsert<"receivables">;
export type UpdatedReceivable = TablesUpdate<"receivables">;

const RECEIVABLES_TABLE = "receivables";

/**
 * Obtiene todas las cuentas por cobrar de la base de datos.
 */
export const getReceivables = async (): Promise<Receivable[]> => {
  const { data, error } = await supabase.from(RECEIVABLES_TABLE).select("*");
  if (error) {
    console.error("Error al obtener cuentas por cobrar:", error);
    throw error;
  }
  return data || [];
};

/**
 * Obtiene una cuenta por cobrar por su ID.
 */
export const getReceivableById = async (
  id: string
): Promise<Receivable | null> => {
  const { data, error } = await supabase
    .from(RECEIVABLES_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error al obtener la cuenta por cobrar con id ${id}:`, error);
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }
  return data;
};

/**
 * Crea una nueva cuenta por cobrar en la base de datos.
 */
export const createReceivable = async (
  receivable: Partial<import("@/types").Receivable>
): Promise<Receivable> => {
  const receivableData = {
    id: receivable.id || uuidv4(),
    client_id: receivable.clientId,
    amount: receivable.amount,
    due_date: receivable.dueDate
      ? new Date(receivable.dueDate).toISOString()
      : new Date().toISOString(),
    description: receivable.description,
    status: receivable.status,
    notes: receivable.notes,
    interest_rate: receivable.interestRate,
    commission: receivable.commission,
    currency: receivable.currency,
    installments: receivable.installments,
    obra_id: receivable.obraId,
  };

  const { data, error } = await supabase
    .from(RECEIVABLES_TABLE)
    .insert(receivableData)
    .select()
    .single();

  if (error) {
    console.error("Error al crear la cuenta por cobrar:", error);
    throw error;
  }
  return data;
};

/**
 * Actualiza una cuenta por cobrar existente.
 */
export const updateReceivable = async (
  id: string,
  updates: UpdatedReceivable
): Promise<Receivable> => {
  const { data, error } = await supabase
    .from(RECEIVABLES_TABLE)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(
      `Error al actualizar la cuenta por cobrar con id ${id}:`,
      error
    );
    throw error;
  }
  return data;
};

/**
 * Elimina una cuenta por cobrar de la base de datos.
 */
export const deleteReceivable = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(RECEIVABLES_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      `Error al eliminar la cuenta por cobrar con id ${id}:`,
      error
    );
    throw error;
  }
};

/**
 * Obtiene todas las cuentas por cobrar de un cliente por su client_id.
 */
export const getReceivablesByClientId = async (
  clientId: string
): Promise<Receivable[]> => {
  const { data, error } = await supabase
    .from(RECEIVABLES_TABLE)
    .select("*")
    .eq("client_id", clientId);
  if (error) throw error;
  return data || [];
};
