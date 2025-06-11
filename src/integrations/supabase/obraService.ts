import { supabase } from "./client";
import { Obra, GastoObra } from "@/types";
import { v4 as uuidv4 } from "uuid";
import type { Tables, TablesInsert, TablesUpdate } from "./types";

// DB types are snake_case from Supabase
type ObraDB = Tables<"obras">;
type GastoObraDB = Tables<"gasto_obras">;
type NewGastoObraDB = TablesInsert<"gasto_obras">;
type NewObraDB = TablesInsert<"obras">;
type UpdateObraDB = TablesUpdate<"obras">;

// Mappers to convert between DB snake_case and app camelCase
const toGastoObra = (gasto: GastoObraDB): GastoObra => ({
  id: gasto.id,
  obraId: gasto.obra_id,
  description: gasto.description,
  amount: gasto.amount,
  date: new Date(gasto.date),
  receiptUrl: gasto.receipt_url || undefined,
  notes: gasto.notes || undefined,
  createdAt: new Date(gasto.created_at),
  updatedAt: new Date(gasto.updated_at),
});

const toObra = (obra: ObraDB): Obra => ({
  id: obra.id,
  name: obra.name,
  description: obra.description || undefined,
  location: obra.location || undefined,
  startDate: obra.start_date ? new Date(obra.start_date) : undefined,
  endDate: obra.end_date ? new Date(obra.end_date) : undefined,
  status: obra.status as Obra["status"],
  budget: obra.budget || undefined,
  createdAt: new Date(obra.created_at),
  updatedAt: new Date(obra.updated_at),
});

// Obras

export const getAllObras = async (): Promise<Obra[]> => {
  const { data, error } = await supabase.from("obras").select("*");
  if (error) throw new Error(error.message);
  return data.map(toObra);
};

export const getObraById = async (id: string): Promise<Obra> => {
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return toObra(data);
};

export const createObra = async (obra: Partial<Obra>): Promise<Obra> => {
  const obraToInsert = {
    id: obra.id || uuidv4(),
    name: obra.name,
    description: obra.description,
    location: obra.location,
    start_date: obra.startDate?.toISOString(),
    end_date: obra.endDate?.toISOString(),
    status: obra.status,
    budget: obra.budget,
  };
  const { data, error } = await supabase
    .from("obras")
    .insert(obraToInsert)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toObra(data);
};

export const updateObra = async (
  id: string,
  obra: Partial<Obra>
): Promise<Obra> => {
  const obraToUpdate = {
    name: obra.name,
    description: obra.description,
    location: obra.location,
    start_date: obra.startDate?.toISOString(),
    end_date: obra.endDate?.toISOString(),
    status: obra.status,
    budget: obra.budget,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("obras")
    .update(obraToUpdate)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toObra(data);
};

export const deleteObra = async (id: string): Promise<void> => {
  const { error } = await supabase.from("obras").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const uploadReceiptImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `obra-receipts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error("Error uploading receipt image: " + uploadError.message);
  }

  const { data } = supabase.storage.from("receipts").getPublicUrl(filePath);

  return data.publicUrl;
};

// Gastos de Obras

export const getGastosByObraId = async (
  obraId: string
): Promise<GastoObra[]> => {
  const { data, error } = await supabase
    .from("gasto_obras")
    .select("*")
    .eq("obra_id", obraId);
  if (error) throw new Error(error.message);
  return data.map(toGastoObra);
};

export const createGastoObra = async (
  gasto: Partial<GastoObra>
): Promise<GastoObra> => {
  const gastoToInsert: NewGastoObraDB = {
    id: gasto.id || uuidv4(),
    obra_id: gasto.obraId,
    description: gasto.description,
    amount: gasto.amount,
    date: gasto.date ? new Date(gasto.date).toISOString() : "now()",
    receipt_url: gasto.receiptUrl,
    notes: gasto.notes,
  };
  const { data, error } = await supabase
    .from("gasto_obras")
    .insert(gastoToInsert)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return toGastoObra(data);
};
