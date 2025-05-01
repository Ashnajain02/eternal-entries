
import React from 'react';
import { WeatherData } from '@/types';
import { cn } from '@/lib/utils';
import { 
  CloudSun, 
  CloudRain, 
  ThermometerSun, 
  ThermometerSnowflake, 
  Droplet, 
  CloudMoonRain,
  Cloud
} from 'lucide-react';

interface WeatherDisplayProps {
  weatherData: WeatherData | null;
  isLoading: boolean;
  className?: string;
  onRefresh?: () => void;
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ 
  weatherData, 
  isLoading,
  className, 
  onRefresh
}) => {
  const getWeatherIcon = (iconName: string) => {
    switch (iconName) {
      case 'cloud-sun':
        return <CloudSun className="weather-icon" />;
      case 'cloud-rain':
        return <CloudRain className="weather-icon" />;
      case 'thermometer-sun':
        return <ThermometerSun className="weather-icon" />;
      case 'thermometer-snowflake':
        return <ThermometerSnowflake className="weather-icon" />;
      case 'droplet':
        return <Droplet className="weather-icon" />;
      case 'cloud-moon-rain':
        return <CloudMoonRain className="weather-icon" />;
      default:
        return <Cloud className="weather-icon" />;
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
        <div className="space-y-1">
          <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
          <div className="h-3 w-12 animate-pulse rounded bg-muted"></div>
        </div>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <button onClick={onRefresh} className="text-xs text-muted-foreground hover:text-primary">
          Get weather data
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {getWeatherIcon(weatherData.icon)}
      <div className="space-y-0">
        <p className="text-sm font-medium leading-none">
          {weatherData.temperature}°C in {weatherData.location}
        </p>
        <p className="text-xs text-muted-foreground">{weatherData.description}</p>
      </div>
    </div>
  );
};

export default WeatherDisplay;
