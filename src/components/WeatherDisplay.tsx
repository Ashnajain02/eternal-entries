
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
  Cloud,
  RefreshCw,
  MapPin,
  Sun,
  Snowflake,
  CloudLightning
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  const { authState } = useAuth();

  // Get user's temperature unit preference
  const { data: userProfile } = useQuery({
    queryKey: ['temperature-settings', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('temperature_unit')
        .eq('id', authState.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching temperature preferences:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!authState.user
  });

  const getWeatherIcon = (iconName: string) => {
    const iconClass = "h-5 w-5 text-muted-foreground";
    switch (iconName) {
      case 'cloud-sun':
        return <CloudSun className={iconClass} />;
      case 'cloud-rain':
        return <CloudRain className={iconClass} />;
      case 'thermometer-sun':
        return <Sun className={iconClass} />;
      case 'thermometer-snowflake':
        return <Snowflake className={iconClass} />;
      case 'droplet':
        return <Droplet className={iconClass} />;
      case 'cloud-moon-rain':
        return <CloudMoonRain className={iconClass} />;
      case 'cloud-lightning':
        return <CloudLightning className={iconClass} />;
      default:
        return <Cloud className={iconClass} />;
    }
  };

  // Convert temperature based on user preference
  // Default to Fahrenheit for unauthenticated users or users without preference set
  const formatTemperature = (celsius: number): string => {
    const useCelsius = userProfile?.temperature_unit === 'celsius';
    
    if (useCelsius) {
      return `${Math.round(celsius)}°C`;
    } else {
      const fahrenheit = (celsius * 9/5) + 32;
      return `${Math.round(fahrenheit)}°F`;
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-5 w-5 animate-pulse rounded-full bg-muted"></div>
        <div className="h-4 w-16 animate-pulse rounded bg-muted"></div>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <Button 
        onClick={onRefresh} 
        variant="ghost" 
        size="sm" 
        className="text-muted-foreground text-xs h-8"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Get weather
      </Button>
    );
  }

  // Check if location is valid
  const hasValidLocation = weatherData.location && 
    !weatherData.location.includes("New York") && 
    !weatherData.location.includes("Manhattan") &&
    weatherData.location !== "Unknown Location" &&
    weatherData.location.trim() !== '';

  return (
    <div className={cn("flex items-center gap-2 group", className)}>
      {getWeatherIcon(weatherData.icon)}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {formatTemperature(weatherData.temperature)}
        </span>
        {weatherData.description && (
          <>
            <span>·</span>
            <span className="capitalize">{weatherData.description}</span>
          </>
        )}
        {hasValidLocation && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {weatherData.location}
            </span>
          </>
        )}
      </div>
      
      {onRefresh && (
        <Button 
          onClick={onRefresh}
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <RefreshCw className="h-3 w-3" />
          <span className="sr-only">Refresh weather</span>
        </Button>
      )}
    </div>
  );
};

export default WeatherDisplay;
