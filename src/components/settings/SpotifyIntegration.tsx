import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { openSpotifyAuthWindow, disconnectSpotify } from '@/services/spotifyAuth';
import { Loader2, Music, Check, X, RefreshCw, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AuthTest from './AuthTest';
import { searchSpotifyTracks } from '@/services/spotify';

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showAuthTest, setShowAuthTest] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleConnectSpotify = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Open Spotify authorization in a new tab
      await openSpotifyAuthWindow();
      
      // Show toast notification
      toast({
        title: 'Spotify Authorization',
        description: 'Please complete the authentication in the new tab. If no tab opened, check your popup blocker.',
      });
    } catch (error: any) {
      console.error('Error opening Spotify auth window:', error);
      
      // Set a more user-friendly error message
      setConnectionError(error.message || 'Failed to connect to Spotify');
      
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
    } finally {
      setIsConnecting(false);
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

  // Add a test search function to help debug
  const testSearch = async () => {
    if (!spotifyStatus.connected) {
      toast({
        title: "Not connected",
        description: "Please connect to Spotify first",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    setSearchResult(null);
    setSearchError(null);
    
    try {
      // Use a simple test query
      const tracks = await searchSpotifyTracks("test");
      setSearchResult({
        success: true,
        trackCount: tracks.length,
        sampleTracks: tracks.slice(0, 2)
      });
      
      if (tracks.length > 0) {
        toast({
          title: "Search successful",
          description: `Found ${tracks.length} tracks`,
        });
      } else {
        toast({
          title: "No results",
          description: "The search was successful but no tracks were found",
        });
      }
    } catch (error: any) {
      console.error("Search test error:", error);
      setSearchError(error.message || "Unknown error");
      
      toast({
        title: "Search failed",
        description: error.message || "Failed to search tracks",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
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
      
      {connectionError && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>
            {connectionError}
          </AlertDescription>
        </Alert>
      )}
      
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
            
            {/* Add search test button */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={testSearch}
                disabled={isSearching}
                className="gap-2"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Test Search
              </Button>
              
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
            
            {/* Show search test results */}
            {searchError && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <p className="font-medium">Search Error:</p>
                <p>{searchError}</p>
              </div>
            )}
            
            {searchResult && (
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium mb-2">Search Result:</p>
                <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-60">
                  {JSON.stringify(searchResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground">
              <p>Connect your Spotify account to enable music integration with your journal entries.</p>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={handleConnectSpotify}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Connect Spotify
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t pt-4 mt-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowAuthTest(!showAuthTest)}
          className="text-xs"
        >
          {showAuthTest ? 'Hide' : 'Show'} Authentication Test
        </Button>
        {showAuthTest && <AuthTest />}
      </div>
    </div>
  );
};
