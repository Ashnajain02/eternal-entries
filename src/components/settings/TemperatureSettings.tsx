
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TemperatureUnit } from '@/types';

export const TemperatureSettings: React.FC = () => {
  const { authState } = useAuth();
  const { toast } = useToast();
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['temperature-settings', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return { temperature_unit: 'fahrenheit' as TemperatureUnit };
      
      const { data, error } = await supabase
        .from('profiles')
        .select('temperature_unit')
        .eq('id', authState.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching temperature preferences:', error);
        return { temperature_unit: 'fahrenheit' as TemperatureUnit };
      }
      
      return data || { temperature_unit: 'fahrenheit' as TemperatureUnit };
    }
  });

  const mutation = useMutation({
    mutationFn: async (newUnit: TemperatureUnit) => {
      if (!authState.user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ temperature_unit: newUnit })
        .eq('id', authState.user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Settings saved",
        description: "Temperature unit preference has been updated"
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleToggleUnit = () => {
    const newUnit = data?.temperature_unit === 'celsius' ? 'fahrenheit' : 'celsius';
    mutation.mutate(newUnit);
  };

  const useCelsius = data?.temperature_unit === 'celsius';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temperature Units</CardTitle>
        <CardDescription>
          Choose your preferred temperature unit for weather displays
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="temperature-unit" className="flex-1">
            Use Celsius (°C) instead of Fahrenheit (°F)
          </Label>
          <Switch
            id="temperature-unit"
            checked={useCelsius}
            onCheckedChange={handleToggleUnit}
            disabled={isLoading || mutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
};
