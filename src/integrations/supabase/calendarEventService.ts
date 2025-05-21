import { supabase } from "./client";
import type { Database, Tables, TablesInsert } from "./types";

export type CalendarEvent = Tables<"calendar_events">;

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase.from("calendar_events").select("*");
  if (error) throw error;
  return data || [];
};

export const createCalendarEvent = async (
  event: TablesInsert<"calendar_events">
) => {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert([event])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCalendarEvent = async (
  id: string,
  updates: Partial<TablesInsert<"calendar_events">>
) => {
  const { data, error } = await supabase
    .from("calendar_events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteCalendarEvent = async (id: string) => {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);
  if (error) throw error;
};
