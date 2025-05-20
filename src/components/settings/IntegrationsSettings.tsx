
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getAuthorizationUrl, isSpotifyConnected, handleSpotifyCallback } from '@/services/spotify';
import { useSearchParams } from 'react-router-dom';

export const IntegrationsSettings: React.FC = () => {
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for auth code in URL (coming back from Spotify)
    const code = searchParams.get('code');
    if (code) {
      handleCallback(code);
    } else {
      checkSpotifyConnection();
    }
  }, [searchParams]);

  const handleCallback = async (code: string) => {
    setIsLoading(true);
    try {
      const success = await handleSpotifyCallback(code);
      
      if (success) {
        toast({
          title: "Spotify Connected",
          description: "Your Spotify account has been successfully connected.",
        });
        setSpotifyConnected(true);
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect your Spotify account. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing Spotify callback:", error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Spotify.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkSpotifyConnection = async () => {
    setIsLoading(true);
    try {
      const connected = await isSpotifyConnected();
      setSpotifyConnected(connected);
    } catch (error) {
      console.error('Error checking Spotify connection:', error);
      toast({
        title: "Error",
        description: "Failed to check Spotify connection status.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectSpotify = () => {
    // Redirect to Spotify authorization page
    window.location.href = getAuthorizationUrl();
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
          <div className="flex items-center justify-between p-4 border rounded-md">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-2 rounded-full">
                <Music className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium">Spotify</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your Spotify account to add songs to your journal entries
                </p>
              </div>
            </div>
            <Button 
              variant={spotifyConnected ? "outline" : "default"}
              disabled={isLoading}
              onClick={handleConnectSpotify}
            >
              {isLoading ? "Checking..." : (spotifyConnected ? "Reconnect" : "Connect")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
