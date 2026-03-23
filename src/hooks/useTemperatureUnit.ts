import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the user's temperature unit preference ('celsius' | 'fahrenheit' | null).
 * Returns null for unauthenticated users or those without a preference set.
 */
export function useTemperatureUnit() {
  const { authState } = useAuth();

  const { data } = useQuery({
    queryKey: ['temperature-unit', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('temperature_unit')
        .eq('id', authState.user.id)
        .single();
      if (error) {
        console.error('Error fetching temperature unit:', error);
        return null;
      }
      return data?.temperature_unit as string | null;
    },
    enabled: !!authState.user,
  });

  return data ?? null;
}
