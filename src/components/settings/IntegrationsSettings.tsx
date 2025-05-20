
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Music, X } from 'lucide-react';
import { connectToSpotify, disconnectSpotify, getSpotifyConnectionStatus, handleSpotifyCallback } from '@/services/spotify';
import { useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const IntegrationsSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyUsername, setSpotifyUsername] = useState<string | null>(null);
  const [isProcessingCode, setIsProcessingCode] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const location = useLocation();

  // Handle Spotify callback
  useEffect(() => {
    const handleCallback = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      
      // Clean the URL without refreshing the page
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (error) {
        toast({
          title: "Authentication Failed",
          description: `Spotify connection was denied: ${error}`,
          variant: "destructive"
        });
        return;
      }
      
      if (code && state) {
        setIsProcessingCode(true);
        try {
          const savedState = localStorage.getItem('spotify_auth_state');
          if (state !== savedState) {
            throw new Error('State mismatch. Authentication attempt may have been compromised.');
          }
          
          const success = await handleSpotifyCallback(code);
          if (success) {
            // Refresh connection status
            checkConnection();
          }
        } catch (error: any) {
          console.error('Error handling Spotify callback:', error);
          toast({
            title: "Connection Failed",
            description: error.message || "Could not connect to Spotify",
            variant: "destructive"
          });
        } finally {
          localStorage.removeItem('spotify_auth_state');
          setIsProcessingCode(false);
        }
      }
    };

    if (location.search) {
      handleCallback();
    }
  }, [location]);

  // Check connection status
  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const status = await getSpotifyConnectionStatus();
      setSpotifyConnected(status.connected && !status.expired);
      setSpotifyUsername(status.username);
      
      // Handle expired token
      if (status.connected && status.expired) {
        toast({
          title: "Spotify Connection Expired",
          description: "Your connection to Spotify has expired. Please reconnect.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error checking Spotify connection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check connection on initial load
  useEffect(() => {
    checkConnection();
  }, []);

  // Handle disconnect confirmation
  const handleDisconnect = async () => {
    try {
      await disconnectSpotify();
      setSpotifyConnected(false);
      setSpotifyUsername(null);
    } catch (error) {
      console.error("Error disconnecting from Spotify:", error);
    } finally {
      setShowDisconnectDialog(false);
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
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                  <Music className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium">Spotify</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect to search and add songs to your journal entries
                  </p>
                </div>
              </div>
              
              {isLoading || isProcessingCode ? (
                <Skeleton className="h-9 w-24" />
              ) : spotifyConnected ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDisconnectDialog(true)}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={connectToSpotify}
                  className="gap-2"
                >
                  <span>Connect</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {spotifyConnected && spotifyUsername && (
              <div className="mt-3 text-sm text-muted-foreground">
                Connected as <span className="font-medium">{spotifyUsername}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Spotify?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your Spotify connection. You'll need to reconnect to search for and add songs to your journal entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
