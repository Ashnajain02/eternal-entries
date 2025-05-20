
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Music } from 'lucide-react';
import { getSpotifyAuthUrl, checkSpotifyConnection, disconnectSpotify } from '@/services/spotify';

export const IntegrationsSettings: React.FC = () => {
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await checkSpotifyConnection();
        setIsSpotifyConnected(connected);
      } catch (error) {
        console.error('Error checking Spotify connection:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkConnection();
  }, []);
  
  const handleConnectSpotify = async () => {
    try {
      const authUrl = await getSpotifyAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error getting Spotify auth URL:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Could not connect to Spotify",
        variant: "destructive"
      });
    }
  };
  
  const handleDisconnectSpotify = async () => {
    try {
      setIsDisconnecting(true);
      await disconnectSpotify();
      setIsSpotifyConnected(false);
      toast({
        title: "Spotify Disconnected",
        description: "Your Spotify account has been disconnected"
      });
    } catch (error) {
      console.error('Error disconnecting Spotify:', error);
      toast({
        title: "Error Disconnecting",
        description: error.message || "Could not disconnect from Spotify",
        variant: "destructive"
      });
    } finally {
      setIsDisconnecting(false);
    }
  };
  
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
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Music className="h-6 w-6 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <h3 className="font-medium">Spotify</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your Spotify account to link songs to your journal entries
                </p>
              </div>
            </div>
            
            {isLoading ? (
              <Button variant="outline" disabled>
                Loading...
              </Button>
            ) : isSpotifyConnected ? (
              <Button 
                variant="outline" 
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={handleDisconnectSpotify}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                onClick={handleConnectSpotify}
              >
                Connect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
