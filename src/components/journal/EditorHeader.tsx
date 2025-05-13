
import React from 'react';
import { format } from 'date-fns';
import WeatherDisplay from '../WeatherDisplay';
import { WeatherData } from '@/types';

interface EditorHeaderProps {
  entryDate: Date;
  weatherData: WeatherData | null;
  isLoadingWeather: boolean;
  onRefreshWeather: () => void;
  lastAutoSave: Date | null;
  locationError: string | null;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  entryDate,
  weatherData,
  isLoadingWeather,
  onRefreshWeather,
  lastAutoSave,
  locationError
}) => {
  // Format the date consistently as full weekday, month day, year
  const formattedDate = format(entryDate, 'EEEE, MMMM d, yyyy');

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h2 className="text-xl font-semibold">{formattedDate}</h2>
      <div className="flex items-center gap-2">
        {lastAutoSave && (
          <p className="text-xs text-muted-foreground">
            Auto-saved {format(lastAutoSave, 'h:mm a')}
          </p>
        )}
        <WeatherDisplay 
          weatherData={weatherData} 
          isLoading={isLoadingWeather} 
          onRefresh={onRefreshWeather} 
        />
      </div>
    </div>
  );
};

export default EditorHeader;
