
import React from 'react';
import { format, parseISO } from 'date-fns';
import WeatherDisplay from '../WeatherDisplay';
import { WeatherData } from '@/types';

interface EntryHeaderProps {
  timestamp: string | number;
  date: string;
  updatedAt?: string | number;
  weather?: WeatherData;
}

const EntryHeader: React.FC<EntryHeaderProps> = ({
  timestamp,
  date,
  updatedAt,
  weather
}) => {
  // Parse ISO date string properly to display in local timezone
  const parseDate = (dateValue: string | number) => {
    if (!dateValue) return new Date();
    
    // Handle both string and number timestamp values
    if (typeof dateValue === 'number') {
      return new Date(dateValue);
    }
    
    // Handle string formats (ISO or date-only)
    if (typeof dateValue === 'string') {
      return dateValue.includes('T') 
        ? parseISO(dateValue) 
        : parseISO(`${dateValue}T00:00:00.000Z`);
    }
    
    return new Date(dateValue);
  };
  
  // Use the actual entry timestamp for the date display when available
  const entryDateTime = timestamp 
    ? parseDate(timestamp)
    : parseDate(date);
  
  // Format the date consistently as full weekday, month day, year - matching the editor
  const formattedDate = format(entryDateTime, 'EEEE, MMMM d, yyyy');
  
  // Format time from timestamp if available
  const formattedTime = timestamp 
    ? format(parseDate(timestamp), 'h:mm a')
    : '';

  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h3 className="text-xl font-semibold">{formattedDate}</h3>
        <p className="text-sm text-muted-foreground">{formattedTime}</p>
        {updatedAt && (
          <p className="text-xs text-muted-foreground">
            Updated: {format(parseDate(updatedAt), 'MMM d, yyyy h:mm a')}
          </p>
        )}
      </div>
      {weather && (
        <WeatherDisplay weatherData={weather} isLoading={false} />
      )}
    </div>
  );
};

export default EntryHeader;
