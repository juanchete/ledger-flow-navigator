import { supabase } from "./client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "./types";
import { v4 as uuidv4 } from "uuid";

// Client uses the 'clients' table from Supabase
export type Client = Tables<"clients">;
export type NewClient = TablesInsert<"clients">;
export type UpdatedClient = TablesUpdate<"clients">;

// Commenting out SupabaseClientRecord as it might not be directly used with UserProfile
// interface SupabaseClientRecord {
//   // ... fields ...
// }

const CLIENTS_TABLE = "clients";

/**
 * Fetches all clients from the database.
 * @returns A promise that resolves to an array of clients.
 */
export const getClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase.from(CLIENTS_TABLE).select("*");
  if (error) {
    console.error("Error fetching clients:", error);
    throw error;
  }
  return data || [];
};

/**
 * Fetches a single client by its ID.
 * @param id The ID of the client to fetch.
 * @returns A promise that resolves to the client object or null if not found.
 */
export const getClientById = async (id: string): Promise<Client | null> => {
  const { data, error } = await supabase
    .from(CLIENTS_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching client with id ${id}:`, error);
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw error;
  }
  return data;
};

/**
 * Creates a new client in the database.
 * @param clientData Data for the new client.
 * @returns A promise that resolves to the created client object.
 */
export const createClient = async (clientData: NewClient): Promise<Client> => {
  const clientWithId = { id: uuidv4(), ...clientData };
  const { data, error } = await supabase
    .from(CLIENTS_TABLE)
    .insert(clientWithId)
    .select()
    .single();

  if (error) {
    console.error("Error creating client:", error);
    throw error;
  }
  return data;
};

/**
 * Updates an existing client in the database.
 * @param id The ID of the client to update.
 * @param updates The partial client object with updates.
 * @returns A promise that resolves to the updated client object.
 */
export const updateClient = async (
  id: string,
  updates: UpdatedClient
): Promise<Client> => {
  const { data, error } = await supabase
    .from(CLIENTS_TABLE)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating client with id ${id}:`, error);
    throw error;
  }
  return data;
};

/**
 * Deletes a client from the database.
 * @param id The ID of the client to delete.
 * @returns A promise that resolves when the client is deleted.
 */
export const deleteClient = async (id: string): Promise<void> => {
  const { error } = await supabase.from(CLIENTS_TABLE).delete().eq("id", id);

  if (error) {
    console.error(`Error deleting client with id ${id}:`, error);
    throw error;
  }
};

export const clientService = {
  async getClients() {
    return getClients();
  },
  async getClientById(id: string) {
    return getClientById(id);
  },
  async createClient(clientData: NewClient) {
    return createClient(clientData);
  },
  async updateClient(id: string, updates: UpdatedClient) {
    return updateClient(id, updates);
  },
  async deleteClient(id: string) {
    return deleteClient(id);
  },
  async searchClients(searchTerm: string) {
    try {
      const { data, error } = await supabase
        .from(CLIENTS_TABLE)
        .select("*")
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order("name", { ascending: true });
      if (error) {
        console.error("Error searching clients:", error);
        return { data: null, error };
      }
      return { data: data || [], error: null };
    } catch (error) {
      console.error("Error in searchClients:", error);
      return { data: null, error };
    }
  },
};
