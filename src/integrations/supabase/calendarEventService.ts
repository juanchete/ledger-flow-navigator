import { supabase } from "./client";
import type { Database, Tables } from "./types";

export type CalendarEvent = Tables<"calendar_events">;

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase.from("calendar_events").select("*");
  if (error) throw error;
  return data || [];
};
