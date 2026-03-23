import { describe, it, expect } from 'vitest';
import { formatTimeAgo } from '../timeAgo';

describe('formatTimeAgo', () => {
  // Happy path: recent timestamps
  it('returns a relative time string for a recent date', () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const result = formatTimeAgo(oneHourAgo);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  // Happy path: old timestamps
  it('returns a relative time string for a date years ago', () => {
    const result = formatTimeAgo('2020-01-01T00:00:00.000Z');
    expect(result).toContain('year');
  });

  // Edge case: future date
  it('handles a future date without crashing', () => {
    const future = new Date(Date.now() + 86400000 * 30).toISOString();
    const result = formatTimeAgo(future);
    expect(typeof result).toBe('string');
  });

  // Happy path: exactly 1 day ago
  it('returns "1 day ago" for a date 24 hours ago', () => {
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const result = formatTimeAgo(oneDayAgo);
    expect(result).toMatch(/1 day/i);
  });
});
