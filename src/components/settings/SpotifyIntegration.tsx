
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { openSpotifyAuthWindow, getSpotifyConnectionStatus, disconnectSpotify } from '@/services/spotify';
import { Loader2, Music, Check, X, RefreshCw } from 'lucide-react';

interface SpotifyStatusProps {
  isLoading: boolean;
  connected: boolean;
  expired: boolean;
  username: string | null;
  lastRefreshed: number;
}

interface SpotifyIntegrationProps {
  spotifyStatus: SpotifyStatusProps;
  setSpotifyStatus: React.Dispatch<React.SetStateAction<SpotifyStatusProps>>;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const SpotifyIntegration: React.FC<SpotifyIntegrationProps> = ({
  spotifyStatus,
  setSpotifyStatus,
  onRefresh,
  isRefreshing
}) => {
  const { toast } = useToast();

  const handleConnectSpotify = async () => {
    try {
      // Open Spotify authorization in a new tab
      await openSpotifyAuthWindow();
      
      // Show toast notification
      toast({
        title: 'Spotify Authorization',
        description: 'Please complete the authentication in the new tab. If no tab opened, check your popup blocker.',
      });
    } catch (error: any) {
      console.error('Error opening Spotify auth window:', error);
      
      // Check if the error is related to popup blocking
      if (error.message && error.message.includes('blocked')) {
        toast({
          title: 'Popup Blocked',
          description: 'Please allow popups for this site and try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to open Spotify authorization.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDisconnectSpotify = async () => {
    try {
      setSpotifyStatus(prev => ({ ...prev, isLoading: true }));
      const result = await disconnectSpotify();
      
      if (result) {
        setSpotifyStatus({
          isLoading: false,
          connected: false,
          expired: false,
          username: null,
          lastRefreshed: Date.now()
        });
        
        toast({
          title: 'Spotify Disconnected',
          description: 'Your Spotify account has been successfully disconnected.',
        });
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error: any) {
      console.error('Error disconnecting from Spotify:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect from Spotify. Please try again.',
        variant: 'destructive',
      });
      setSpotifyStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
            <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-medium">Spotify</h3>
            <p className="text-sm text-muted-foreground">
              Connect to search for and add songs to your journal entries
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh connection status"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          {spotifyStatus.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking...</span>
            </div>
          ) : spotifyStatus.connected ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <X className="h-4 w-4" />
              <span>Not connected</span>
            </div>
          )}
        </div>
      </div>
      
      <div>
        {spotifyStatus.isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : spotifyStatus.connected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div className="font-medium">Connected as</div>
              <div>{spotifyStatus.username || 'Unknown user'}</div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={handleDisconnectSpotify}
                disabled={spotifyStatus.isLoading}
              >
                {spotifyStatus.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button onClick={handleConnectSpotify}>
              Connect Spotify
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
