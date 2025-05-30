
import { Client } from '@/types';
import { Client as SupabaseClient } from '@/integrations/supabase/clientService';

export const mapSupabaseClientToClient = (supabaseClient: SupabaseClient): Client => {
  return {
    id: supabaseClient.id,
    name: supabaseClient.name,
    email: supabaseClient.email || '',
    phone: supabaseClient.phone || '',
    category: supabaseClient.category as Client["category"] || 'individual',
    clientType: supabaseClient.client_type as Client["clientType"] || 'direct',
    active: supabaseClient.active,
    address: supabaseClient.address || '',
    contactPerson: supabaseClient.contact_person || '',
    documents: [],
    createdAt: supabaseClient.created_at ? new Date(supabaseClient.created_at) : new Date(),
    updatedAt: supabaseClient.updated_at ? new Date(supabaseClient.updated_at) : new Date(),
    alertStatus: (supabaseClient.alert_status as 'none' | 'yellow' | 'red') || 'none',
    alertNote: supabaseClient.alert_note || '',
    relatedToClientId: supabaseClient.related_to_client_id || undefined,
  };
};
