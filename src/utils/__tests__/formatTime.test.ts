import { describe, it, expect } from 'vitest';
import { formatTime } from '../formatTime';

describe('formatTime', () => {
  // Happy path
  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats 60 seconds as 1:00', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('formats 90 seconds as 1:30', () => {
    expect(formatTime(90)).toBe('1:30');
  });

  it('formats 5 seconds as 0:05 (zero-padded)', () => {
    expect(formatTime(5)).toBe('0:05');
  });

  // Edge case: large values
  it('formats 3600 seconds as 60:00', () => {
    expect(formatTime(3600)).toBe('60:00');
  });

  // Edge case: decimal seconds
  it('floors decimal seconds', () => {
    expect(formatTime(90.7)).toBe('1:30');
  });

  // Edge case: negative (shouldn't happen, but defensive)
  it('handles negative input', () => {
    const result = formatTime(-1);
    expect(typeof result).toBe('string');
  });
});
