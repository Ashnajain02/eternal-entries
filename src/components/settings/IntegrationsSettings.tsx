
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, AlertTriangle, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { initiateSpotifyAuth, isSpotifyConnected, disconnectSpotify } from '@/services/spotify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    setShowPopupBlockedHelp(false);
    
    const result = await initiateSpotifyAuth();
    
    if (!result.success) {
      if (result.popupBlocked) {
        // Show help message for popup blocked
        setShowPopupBlockedHelp(true);
        toast({
          title: "Popup Blocked",
          description: "Please enable popups or use the link below to connect.",
          variant: "destructive",
        });
      } else {
        console.error('Error connecting to Spotify:', result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to connect to Spotify. Please try again.",
          variant: "destructive",
        });
      }
    }
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
        description: "Failed to disconnect from Spotify. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-md">
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
                {isLoading ? "Checking..." : "Connect"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Popup Blocked Help */}
      {showPopupBlockedHelp && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Popup Blocked</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Your browser blocked the Spotify login popup. To connect your account:
            </p>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Option 1: Enable Popups</p>
              <ul className="list-disc list-inside pl-2 space-y-1 text-muted-foreground">
                <li><strong>iPhone Safari:</strong> Settings → Safari → Block Pop-ups (turn OFF)</li>
                <li><strong>Android Chrome:</strong> Tap the lock icon in address bar → Site Settings → Pop-ups → Allow</li>
                <li><strong>Desktop:</strong> Look for a popup blocked icon in your address bar and click "Allow"</li>
              </ul>
              <p className="pt-2">After enabling popups, tap "Connect" again.</p>
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
