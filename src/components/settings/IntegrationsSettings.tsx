
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { initiateSpotifyAuth, isSpotifyConnected, disconnectSpotify } from '@/services/spotify';

export const IntegrationsSettings: React.FC = () => {
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkSpotifyConnection();
  }, []);

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

  const handleConnectSpotify = async () => {
    try {
      await initiateSpotifyAuth();
    } catch (error) {
      console.error('Error connecting to Spotify:', error);
      toast({
        title: "Error",
        description: "Failed to connect to Spotify. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectSpotify = async () => {
    setIsLoading(true);
    try {
      const success = await disconnectSpotify();
      
      if (success) {
        setSpotifyConnected(false);
        toast({
          title: "Disconnected",
          description: "Your Spotify account has been disconnected.",
        });
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error('Error disconnecting Spotify:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect from Spotify. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
            {spotifyConnected ? (
              <Button 
                variant="outline"
                disabled={isLoading}
                onClick={handleDisconnectSpotify}
              >
                {isLoading ? "Processing..." : "Disconnect"}
              </Button>
            ) : (
              <Button 
                variant="default"
                disabled={isLoading}
                onClick={handleConnectSpotify}
              >
                {isLoading ? "Checking..." : "Connect"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
