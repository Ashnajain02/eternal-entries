// Weather overlay types - frozen at journal creation time

export type WeatherCategory = 'rain' | 'snow' | 'fog' | 'clear';
export type TimeOfDay = 'day' | 'night' | 'twilight';

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
  if (lower.includes('snow') || lower.includes('sleet') || lower.includes('blizzard')) {
    return 'snow';
  }
  if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze') || lower.includes('cloud') || lower.includes('overcast')) {
    return 'fog';
  }
  return 'clear';
}

/**
 * Derives time of day from timestamp
 */
export function deriveTimeOfDay(timestamp: string | number): TimeOfDay {
  let date: Date;
  
  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = timestamp.includes('T') ? new Date(timestamp) : new Date(`${timestamp}T00:00:00.000Z`);
  } else {
    return 'day';
  }
  
  const hour = date.getHours();
  
  // 5-7 AM or 5-8 PM = twilight (golden hour)
  if ((hour >= 5 && hour < 7) || (hour >= 17 && hour < 20)) {
    return 'twilight';
  }
  // 7 AM - 5 PM = day
  if (hour >= 7 && hour < 17) {
    return 'day';
  }
  // Otherwise night
  return 'night';
}
