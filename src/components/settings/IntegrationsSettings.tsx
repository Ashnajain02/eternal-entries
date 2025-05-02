
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SpotifyIntegration } from './SpotifyIntegration';

interface SpotifyStatusProps {
  isLoading: boolean;
  connected: boolean;
  expired: boolean;
  username: string | null;
  lastRefreshed: number;
}

interface IntegrationsSettingsProps {
  spotifyStatus: SpotifyStatusProps;
  setSpotifyStatus: React.Dispatch<React.SetStateAction<SpotifyStatusProps>>;
  onRefreshSpotify: () => void;
  isRefreshing: boolean;
}

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({
  spotifyStatus,
  setSpotifyStatus,
  onRefreshSpotify,
  isRefreshing
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Services</CardTitle>
        <CardDescription>
          Manage your connected services and integrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Spotify Integration */}
          <SpotifyIntegration 
            spotifyStatus={spotifyStatus}
            setSpotifyStatus={setSpotifyStatus}
            onRefresh={onRefreshSpotify}
            isRefreshing={isRefreshing}
          />
        </div>
      </CardContent>
    </Card>
  );
};
