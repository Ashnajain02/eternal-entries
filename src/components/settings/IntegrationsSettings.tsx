import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { initiateSpotifyAuth, isSpotifyConnected, disconnectSpotify } from '@/services/spotify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SpotifyProfileDisplay } from './SpotifyProfileDisplay';

export const IntegrationsSettings: React.FC = () => {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPopupBlockedHelp, setShowPopupBlockedHelp] = useState(false);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectSpotify = async () => {
    setShowPopupBlockedHelp(false);
    setIsLoading(true);
    
    const result = await initiateSpotifyAuth();
    
    if (!result.success) {
      setIsLoading(false);
      
      if (result.popupBlocked) {
        setShowPopupBlockedHelp(true);
        toast({
          title: "Popup Blocked",
          description: "Please enable popups to connect to Spotify.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to connect to Spotify.",
          variant: "destructive",
        });
      }
    }
    // Loading state stays until user returns from auth flow
  };

  const handleDisconnectSpotify = async () => {
    setIsLoading(true);
    try {
      const success = await disconnectSpotify();
      
      if (success) {
        setSpotifyConnected(false);
        setShowPopupBlockedHelp(false);
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
        description: "Failed to disconnect from Spotify.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Re-check connection when window gains focus (user might have completed auth in popup)
  useEffect(() => {
    const handleFocus = () => {
      if (isLoading) {
        checkSpotifyConnection();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isLoading]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Connected Services</CardTitle>
          <CardDescription>
            Manage your connected services and integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col p-4 border rounded-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full shrink-0">
                  <Music className="h-5 w-5 text-green-500" />
                </div>
                <div className="min-w-0">
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
                  className="shrink-0 w-full sm:w-auto"
                >
                  {isLoading ? "Processing..." : "Disconnect"}
                </Button>
              ) : (
                <Button 
                  variant="default"
                  disabled={isLoading}
                  onClick={handleConnectSpotify}
                  className="shrink-0 w-full sm:w-auto"
                >
                  {isLoading ? "Connecting..." : "Connect"}
                </Button>
              )}
            </div>
            {/* Show Spotify profile when connected */}
            {spotifyConnected && <SpotifyProfileDisplay />}
          </div>
        </CardContent>
      </Card>
      
      {showPopupBlockedHelp && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Popup Blocked</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Your browser blocked the Spotify login popup. To connect your account:
            </p>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Enable Popups:</p>
              <ul className="list-disc list-inside pl-2 space-y-1 text-muted-foreground">
                <li><strong>iPhone Safari:</strong> Settings → Safari → Block Pop-ups (turn OFF)</li>
                <li><strong>Android Chrome:</strong> Tap the lock icon in address bar → Site Settings → Pop-ups → Allow</li>
                <li><strong>Desktop:</strong> Look for a popup blocked icon in your address bar and click "Allow"</li>
              </ul>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleConnectSpotify}
              className="mt-2"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
