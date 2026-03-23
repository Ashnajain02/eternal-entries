import { describe, it, expect } from 'vitest';
import { formatTemperature } from '../temperature';

describe('formatTemperature', () => {
  // Happy path: Fahrenheit (default)
  it('converts 0°C to 32°F when unit is undefined', () => {
    expect(formatTemperature(0)).toBe('32°F');
  });

  it('converts 0°C to 32°F when unit is null', () => {
    expect(formatTemperature(0, null)).toBe('32°F');
  });

  it('converts 100°C to 212°F by default', () => {
    expect(formatTemperature(100)).toBe('212°F');
  });

  it('converts 20°C to 68°F by default', () => {
    expect(formatTemperature(20)).toBe('68°F');
  });

  // Happy path: explicit Fahrenheit
  it('converts to Fahrenheit when unit is "fahrenheit"', () => {
    expect(formatTemperature(0, 'fahrenheit')).toBe('32°F');
  });

  // Happy path: Celsius
  it('returns Celsius when unit is "celsius"', () => {
    expect(formatTemperature(0, 'celsius')).toBe('0°C');
  });

  it('returns 20°C when unit is "celsius"', () => {
    expect(formatTemperature(20, 'celsius')).toBe('20°C');
  });

  it('returns -40 for both scales at -40', () => {
    // -40 is the point where Celsius and Fahrenheit are equal
    expect(formatTemperature(-40, 'celsius')).toBe('-40°C');
    expect(formatTemperature(-40, 'fahrenheit')).toBe('-40°F');
  });

  // Edge cases: rounding
  it('rounds Fahrenheit values', () => {
    // 22°C = 71.6°F → should round to 72°F
    expect(formatTemperature(22)).toBe('72°F');
  });

  it('rounds Celsius values', () => {
    // 22.4 → 22°C
    expect(formatTemperature(22.4, 'celsius')).toBe('22°C');
    // 22.6 → 23°C
    expect(formatTemperature(22.6, 'celsius')).toBe('23°C');
  });

  // Edge case: negative temperatures
  it('handles negative Celsius in Fahrenheit mode', () => {
    // -10°C = 14°F
    expect(formatTemperature(-10)).toBe('14°F');
  });

  it('handles negative Celsius in Celsius mode', () => {
    expect(formatTemperature(-10, 'celsius')).toBe('-10°C');
  });

  // Break case: unexpected unit string defaults to Fahrenheit
  it('defaults to Fahrenheit for unknown unit strings', () => {
    expect(formatTemperature(0, 'kelvin')).toBe('32°F');
    expect(formatTemperature(0, '')).toBe('32°F');
  });

  // Edge case: very large/small values
  it('handles extreme temperatures', () => {
    expect(formatTemperature(1000, 'celsius')).toBe('1000°C');
    expect(formatTemperature(-273, 'celsius')).toBe('-273°C');
  });
});
