import { parseISO } from 'date-fns';

/**
 * Parse a date value that can be a number (timestamp), ISO string, or date-only string.
 * Returns a Date object.
 */
export function parseDate(dateValue: string | number): Date {
  if (!dateValue) return new Date();
  if (typeof dateValue === 'number') return new Date(dateValue);
  return dateValue.includes('T')
    ? parseISO(dateValue)
    : parseISO(`${dateValue}T00:00:00.000Z`);
}
