import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Music } from 'lucide-react';

interface SpotifyProfile {
  display_name: string;
  images: { url: string }[];
}

export const SpotifyProfileDisplay: React.FC = () => {
  const { authState } = useAuth();

  // First check if Spotify is connected
  const { data: isConnected } = useQuery({
    queryKey: ['spotify-connected', authState.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('spotify-playback-token', {
        body: { action: 'is_connected' }
      });
      
      if (error) return false;
      return data?.connected ?? false;
    },
    enabled: !!authState.user,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch Spotify profile if connected
  const { data: profile, isLoading } = useQuery({
    queryKey: ['spotify-profile', authState.user?.id],
    queryFn: async (): Promise<SpotifyProfile | null> => {
      // Get access token from playback token endpoint
      const { data, error } = await supabase.functions.invoke('spotify-playback-token', {
        body: { action: 'get_token' }
      });
      
      if (error || !data?.access_token) {
        console.error('Error getting Spotify token:', error);
        return null;
      }

      // Fetch profile from Spotify API
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });

      if (!response.ok) {
        console.error('Error fetching Spotify profile:', response.status);
        return null;
      }

      return response.json();
    },
    enabled: !!authState.user && isConnected === true,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Don't render anything if not connected or loading
  if (!isConnected || isLoading || !profile) {
    return null;
  }

  const profileImage = profile.images?.[0]?.url;
  const displayName = profile.display_name || 'Spotify User';

  return (
    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
      <Avatar className="h-8 w-8">
        {profileImage ? (
          <AvatarImage src={profileImage} alt={displayName} />
        ) : null}
        <AvatarFallback className="bg-green-100 dark:bg-green-900/30">
          <Music className="h-4 w-4 text-green-500" />
        </AvatarFallback>
      </Avatar>
      <div className="text-sm">
        <span className="text-muted-foreground">Connected as </span>
        <span className="font-medium">{displayName}</span>
      </div>
    </div>
  );
};