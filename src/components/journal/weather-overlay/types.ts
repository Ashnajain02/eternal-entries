// Weather overlay types - frozen at journal creation time

export type WeatherCategory = 'rain' | 'snow' | 'fog' | 'clear';
export type TimeOfDay = 'morning' | 'evening' | 'night';

export interface WeatherOverlayState {
  category: WeatherCategory;
  timeOfDay: TimeOfDay;
}

/**
 * Derives weather category from OpenWeatherMap description
 */
export function deriveWeatherCategory(description: string): WeatherCategory {
  const lower = description.toLowerCase();
  
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower') || lower.includes('thunderstorm')) {
    return 'rain';
  }
  if (lower.includes('snow') || lower.includes('sleet') || lower.includes('blizzard') || lower.includes('flurr')) {
    return 'snow';
  }
  if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze') || lower.includes('cloud') || lower.includes('overcast')) {
    return 'fog';
  }
  return 'clear';
}

/**
 * Derives time of day from timestamp using fixed thresholds (local time)
 * Morning: 05:00 → 16:00
 * Evening: 16:00 → 20:00
 * Night: 20:00 → 05:00
 */
export function deriveTimeOfDay(timestamp: string | number): TimeOfDay {
  let date: Date;
  
  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = timestamp.includes('T') ? new Date(timestamp) : new Date(`${timestamp}T00:00:00`);
  } else {
    return 'morning';
  }
  
  const hour = date.getHours();
  
  // Morning: 05:00 → 16:00
  if (hour >= 5 && hour < 16) {
    return 'morning';
  }
  // Evening: 16:00 → 20:00
  if (hour >= 16 && hour < 20) {
    return 'evening';
  }
  // Night: 20:00 → 05:00
  return 'night';
}
