import { supabase } from "./client";
import type { Client } from "@/types";
import { v4 as uuidv4 } from "uuid";

// Definir tipo para la estructura de cliente en Supabase
interface SupabaseClientRecord {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  category?: string;
  client_type?: string;
  identification_type?: string;
  identification_number?: string;
  identification_file_url?: string;
  active?: boolean;
  address?: string;
  contact_person?: string;
  alert_status?: string;
  alert_note?: string;
  related_to_client_id?: string;
  created_at?: string;
  updated_at: string;
}

/**
 * Servicio para gestionar clientes en Supabase
 */
export const clientService = {
  /**
   * Obtiene todos los clientes
   */
  async getClients() {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching clients:", error);
        return { data: null, error };
      }

      // Convertir los datos a formato de Cliente de la aplicación
      const formattedClients: Client[] = data.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        category: client.category as Client["category"],
        clientType: client.client_type as Client["clientType"],
        identificationDoc: client.identification_type
          ? {
              type: client.identification_type as "ID" | "RIF",
              number: client.identification_number || "",
              fileUrl: client.identification_file_url || undefined,
            }
          : undefined,
        active: client.active,
        address: client.address || "",
        contactPerson: client.contact_person || undefined,
        documents: [], // Cargar documentos en otra consulta si es necesario
        createdAt: new Date(client.created_at),
        updatedAt: new Date(client.updated_at),
        alertStatus: (client.alert_status as Client["alertStatus"]) || "none",
        alertNote: client.alert_note || undefined,
        relatedToClientId: client.related_to_client_id || undefined,
      }));

      return { data: formattedClients, error: null };
    } catch (error) {
      console.error("Error in getClients:", error);
      return { data: null, error };
    }
  },

  /**
   * Obtiene un cliente por su ID
   */
  async getClientById(id: string) {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(`Error fetching client with ID ${id}:`, error);
        return { data: null, error };
      }

      // Convertir a formato Cliente
      const formattedClient: Client = {
        id: data.id,
        name: data.name,
        email: data.email || "",
        phone: data.phone || "",
        category: data.category as Client["category"],
        clientType: data.client_type as Client["clientType"],
        identificationDoc: data.identification_type
          ? {
              type: data.identification_type as "ID" | "RIF",
              number: data.identification_number || "",
              fileUrl: data.identification_file_url || undefined,
            }
          : undefined,
        active: data.active,
        address: data.address || "",
        contactPerson: data.contact_person || undefined,
        documents: [], // Cargar documentos en otra consulta si es necesario
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        alertStatus: (data.alert_status as Client["alertStatus"]) || "none",
        alertNote: data.alert_note || undefined,
        relatedToClientId: data.related_to_client_id || undefined,
      };

      return { data: formattedClient, error: null };
    } catch (error) {
      console.error(`Error in getClientById for ID ${id}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Crea un nuevo cliente
   */
  async createClient(
    clientData: Omit<Client, "id" | "createdAt" | "updatedAt" | "documents">
  ) {
    try {
      // Generar un ID único usando UUID
      const uniqueId = uuidv4();

      // Convertir a formato de la tabla de Supabase
      const supabaseClient = {
        id: uniqueId, // Agregar el ID único generado
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        category: clientData.category,
        client_type: clientData.clientType,
        identification_type: clientData.identificationDoc?.type,
        identification_number: clientData.identificationDoc?.number,
        identification_file_url: clientData.identificationDoc?.fileUrl,
        active: clientData.active,
        address: clientData.address,
        contact_person: clientData.contactPerson,
        alert_status: clientData.alertStatus,
        alert_note: clientData.alertNote,
        related_to_client_id: clientData.relatedToClientId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("clients")
        .insert(supabaseClient)
        .select()
        .single();

      if (error) {
        console.error("Error creating client:", error);
        return { data: null, error };
      }

      // Convertir el resultado a formato Cliente
      const createdClient: Client = {
        id: data.id,
        name: data.name,
        email: data.email || "",
        phone: data.phone || "",
        category: data.category as Client["category"],
        clientType: data.client_type as Client["clientType"],
        identificationDoc: data.identification_type
          ? {
              type: data.identification_type as "ID" | "RIF",
              number: data.identification_number || "",
              fileUrl: data.identification_file_url || undefined,
            }
          : undefined,
        active: data.active,
        address: data.address || "",
        contactPerson: data.contact_person || undefined,
        documents: [], // Inicialmente vacío
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        alertStatus: (data.alert_status as Client["alertStatus"]) || "none",
        alertNote: data.alert_note || undefined,
        relatedToClientId: data.related_to_client_id || undefined,
      };

      return { data: createdClient, error: null };
    } catch (error) {
      console.error("Error in createClient:", error);
      return { data: null, error };
    }
  },

  /**
   * Actualiza un cliente existente
   */
  async updateClient(
    id: string,
    clientData: Partial<
      Omit<Client, "id" | "createdAt" | "updatedAt" | "documents">
    >
  ) {
    try {
      // Convertir a formato de la tabla de Supabase
      const supabaseClient: SupabaseClientRecord = {
        updated_at: new Date().toISOString(),
      };

      if (clientData.name !== undefined) supabaseClient.name = clientData.name;
      if (clientData.email !== undefined)
        supabaseClient.email = clientData.email;
      if (clientData.phone !== undefined)
        supabaseClient.phone = clientData.phone;
      if (clientData.category !== undefined)
        supabaseClient.category = clientData.category;
      if (clientData.clientType !== undefined)
        supabaseClient.client_type = clientData.clientType;
      if (clientData.active !== undefined)
        supabaseClient.active = clientData.active;
      if (clientData.address !== undefined)
        supabaseClient.address = clientData.address;
      if (clientData.contactPerson !== undefined)
        supabaseClient.contact_person = clientData.contactPerson;
      if (clientData.alertStatus !== undefined)
        supabaseClient.alert_status = clientData.alertStatus;
      if (clientData.alertNote !== undefined)
        supabaseClient.alert_note = clientData.alertNote;
      if (clientData.relatedToClientId !== undefined)
        supabaseClient.related_to_client_id = clientData.relatedToClientId;

      // Actualizar la información del documento de identificación si está presente
      if (clientData.identificationDoc) {
        if (clientData.identificationDoc.type)
          supabaseClient.identification_type =
            clientData.identificationDoc.type;
        if (clientData.identificationDoc.number)
          supabaseClient.identification_number =
            clientData.identificationDoc.number;
        if (clientData.identificationDoc.fileUrl)
          supabaseClient.identification_file_url =
            clientData.identificationDoc.fileUrl;
      }

      const { data, error } = await supabase
        .from("clients")
        .update(supabaseClient)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating client with ID ${id}:`, error);
        return { data: null, error };
      }

      // Convertir el resultado a formato Cliente
      const updatedClient: Client = {
        id: data.id,
        name: data.name,
        email: data.email || "",
        phone: data.phone || "",
        category: data.category as Client["category"],
        clientType: data.client_type as Client["clientType"],
        identificationDoc: data.identification_type
          ? {
              type: data.identification_type as "ID" | "RIF",
              number: data.identification_number || "",
              fileUrl: data.identification_file_url || undefined,
            }
          : undefined,
        active: data.active,
        address: data.address || "",
        contactPerson: data.contact_person || undefined,
        documents: [], // Mantenemos vacío
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        alertStatus: (data.alert_status as Client["alertStatus"]) || "none",
        alertNote: data.alert_note || undefined,
        relatedToClientId: data.related_to_client_id || undefined,
      };

      return { data: updatedClient, error: null };
    } catch (error) {
      console.error(`Error in updateClient for ID ${id}:`, error);
      return { data: null, error };
    }
  },

  /**
   * Elimina un cliente
   */
  async deleteClient(id: string) {
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) {
        console.error(`Error deleting client with ID ${id}:`, error);
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error(`Error in deleteClient for ID ${id}:`, error);
      return { success: false, error };
    }
  },

  /**
   * Busca clientes por término
   */
  async searchClients(searchTerm: string) {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .or(
          `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%`
        )
        .order("name", { ascending: true });

      if (error) {
        console.error("Error searching clients:", error);
        return { data: null, error };
      }

      // Convertir los datos a formato de Cliente de la aplicación
      const formattedClients: Client[] = data.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        category: client.category as Client["category"],
        clientType: client.client_type as Client["clientType"],
        identificationDoc: client.identification_type
          ? {
              type: client.identification_type as "ID" | "RIF",
              number: client.identification_number || "",
              fileUrl: client.identification_file_url || undefined,
            }
          : undefined,
        active: client.active,
        address: client.address || "",
        contactPerson: client.contact_person || undefined,
        documents: [], // Cargar documentos en otra consulta si es necesario
        createdAt: new Date(client.created_at),
        updatedAt: new Date(client.updated_at),
        alertStatus: (client.alert_status as Client["alertStatus"]) || "none",
        alertNote: client.alert_note || undefined,
        relatedToClientId: client.related_to_client_id || undefined,
      }));

      return { data: formattedClients, error: null };
    } catch (error) {
      console.error("Error in searchClients:", error);
      return { data: null, error };
    }
  },
};
