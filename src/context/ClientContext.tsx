import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { clientService } from "@/integrations/supabase/clientService";
import type { Client } from "@/types";

interface ClientContextType {
  clients: Client[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await clientService.getClients();
      const mapped: Client[] = data.map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        email: c.email as string,
        phone: c.phone as string,
        category: c.category as string,
        clientType: c.client_type as 'direct' | 'indirect',
        active: c.active as boolean,
        address: c.address as string,
        contactPerson: c.contact_person as string,
        documents: (c.documents as any[]) || [],
        createdAt: c.created_at ? new Date(c.created_at as string) : undefined,
        updatedAt: c.updated_at ? new Date(c.updated_at as string) : undefined,
        alertStatus: (c.alert_status as string) || "none",
        alertNote: (c.alert_note as string) || "",
        relatedToClientId: c.related_to_client_id as string,
      }));
      setClients(mapped);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error("Error desconocido"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <ClientContext.Provider value={{ clients, isLoading, error, refetch: fetchClients }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClients debe usarse dentro de un ClientProvider");
  }
  return context;
}; 