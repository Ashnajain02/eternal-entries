/**
 * Format a Celsius temperature value based on the user's unit preference.
 * Defaults to Fahrenheit when no preference is set.
 */
export function formatTemperature(
  celsius: number,
  unit?: string | null
): string {
  if (unit === 'celsius') {
    return `${Math.round(celsius)}°C`;
  }
  const fahrenheit = (celsius * 9 / 5) + 32;
  return `${Math.round(fahrenheit)}°F`;
}
