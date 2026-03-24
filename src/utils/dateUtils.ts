import { parseISO, format as fnsFormat } from 'date-fns';

// ── Parsing ──

/**
 * Parse a date value (number/ISO string/date-only string) into a Date object.
 * All parsed dates represent the same instant in time — display functions
 * handle timezone conversion via the browser's local timezone.
 */
export function parseDate(dateValue: string | number): Date {
  if (!dateValue) return new Date();
  if (typeof dateValue === 'number') return new Date(dateValue);
  return dateValue.includes('T')
    ? parseISO(dateValue)
    : parseISO(`${dateValue}T00:00:00`); // no Z → parsed as local
}

// ── Creating timestamps for storage ──

/**
 * Get the current local date as YYYY-MM-DD.
 * Uses date-fns format() which respects the browser timezone.
 */
export function getLocalDate(): string {
  return fnsFormat(new Date(), 'yyyy-MM-dd');
}

/**
 * Get the current UTC ISO timestamp for database storage.
 */
export function getUtcTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get the user's IANA timezone (e.g. "America/New_York").
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Extract local date (YYYY-MM-DD) from a UTC timestamp string,
 * using the browser's current timezone.
 */
export function extractLocalDate(isoTimestamp: string): string {
  return fnsFormat(parseISO(isoTimestamp), 'yyyy-MM-dd');
}

// ── Display formatting ──
// All of these convert the stored UTC timestamp to the viewer's local timezone
// automatically (Date objects in JS always display in local tz).

export function formatEntryDate(dateValue: string | number): string {
  return fnsFormat(parseDate(dateValue), 'EEEE, MMMM d');
}

export function formatEntryYear(dateValue: string | number): string {
  return fnsFormat(parseDate(dateValue), 'yyyy');
}

/**
 * Format time with timezone abbreviation. Used everywhere time is displayed.
 */
function formatTimeWithTz(dateValue: string | number): string {
  const d = parseDate(dateValue);
  const time = fnsFormat(d, 'h:mm a');
  const tz = d.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || '';
  return `${time} ${tz}`;
}

export function formatEntryTime(dateValue: string | number): string {
  return formatTimeWithTz(dateValue);
}

export function formatFullDate(dateValue: string | number): string {
  return fnsFormat(parseDate(dateValue), 'EEEE, MMMM d, yyyy');
}

export function formatCommentDate(dateValue: string | number): string {
  return fnsFormat(parseDate(dateValue), 'MMM d, yyyy');
}

export function formatCommentTime(dateValue: string | number): string {
  return formatTimeWithTz(dateValue);
}
