import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useVisitLogger() {
  const { authState } = useAuth();

  useEffect(() => {
    const logVisit = async () => {
      if (!authState.user) return;

      let city: string | null = null;
      let region: string | null = null;
      let country: string | null = null;
      let latitude: number | null = null;
      let longitude: number | null = null;

      // Try to get location from IP geolocation API
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const geo = await res.json();
          city = geo.city || null;
          region = geo.region || null;
          country = geo.country_name || null;
          latitude = geo.latitude || null;
          longitude = geo.longitude || null;
        }
      } catch (e) {
        console.warn('Could not fetch location for visit log:', e);
      }

      await supabase.from('visit_logs').insert({
        user_id: authState.user.id,
        city,
        region,
        country,
        latitude,
        longitude,
      });
    };

    logVisit();
  }, [authState.user]);
}
