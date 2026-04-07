import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (
  value: number,
  currency: string = "USD"
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(value);
};

export const formatDateEs = (
  date: Date | string,
  formatStr: string
): string => {
  const dateObj = parseLocalDate(date);
  return format(dateObj, formatStr, { locale: es });
};

/**
 * Parse a value coming from a Postgres `date` column (e.g. "2026-04-10")
 * as a local-time Date instead of UTC. JavaScript's `new Date("2026-04-10")`
 * interprets the string as UTC midnight, which in negative-offset zones
 * (e.g. Venezuela UTC-4) becomes the previous day at 8 PM local — causing
 * an off-by-one when formatted.
 */
export const parseLocalDate = (value: Date | string): Date => {
  if (value instanceof Date) return value;
  const datePart = value.substring(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
};
