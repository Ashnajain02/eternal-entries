import { intervalToDuration } from 'date-fns';

/**
 * Formats a date into a human-readable "time ago" string using the two largest units.
 * e.g., "3 months ago", "1 year and 2 weeks ago", "5 days ago"
 */
export function formatTimeAgo(date: string | Date): string {
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  const duration = intervalToDuration({ start: target, end: now });

  const parts: string[] = [];

  if (duration.years && duration.years > 0) {
    parts.push(`${duration.years} ${duration.years === 1 ? 'year' : 'years'}`);
  }
  if (duration.months && duration.months > 0) {
    parts.push(`${duration.months} ${duration.months === 1 ? 'month' : 'months'}`);
  }
  if (duration.weeks && duration.weeks > 0) {
    parts.push(`${duration.weeks} ${duration.weeks === 1 ? 'week' : 'weeks'}`);
  }
  if (duration.days && duration.days > 0) {
    parts.push(`${duration.days} ${duration.days === 1 ? 'day' : 'days'}`);
  }

  if (parts.length === 0) {
    return 'today';
  }

  // Take the two largest units for a natural feel
  const display = parts.slice(0, 2).join(' and ');
  return `${display} ago`;
}
