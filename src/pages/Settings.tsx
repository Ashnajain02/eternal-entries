import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import { getSpotifyConnectionStatus, openSpotifyAuthWindow, disconnectSpotify } from '@/services/spotify';
import { Loader2, Music, Check, X, RefreshCw } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';

const Settings = () => {
  const { authState } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [spotifyStatus, setSpotifyStatus] = useState<{
    isLoading: boolean;
    connected: boolean;
    expired: boolean;
    username: string | null;
    lastRefreshed: number;
  }>({
    isLoading: true,
    connected: false,
    expired: false,
    username: null,
    lastRefreshed: Date.now()
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSpotifyStatus = useCallback(async (showToast = false) => {
    try {
      if (!authState.user) return;
      
      setIsRefreshing(true);
      
      // Check if we just came from a successful connection
      const justConnected = searchParams.get('spotify_connected') === 'true';
      if (justConnected) {
        console.log("Detected successful Spotify connection from URL param, refreshing status...");
        // Add a small delay to allow the database to update
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log("Fetching Spotify connection status...");
      
      // Fetch multiple times to ensure we get the latest data
      // This is a workaround for potential cache or timing issues
      let attempts = 0;
      let status;
      
      while (attempts < 3) {
        status = await getSpotifyConnectionStatus();
        console.log(`Spotify status attempt ${attempts + 1}:`, status);
        
        // If connected, we're good
        if (status.connected) break;
        
        // Otherwise wait a bit and try again
        if (attempts < 2) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        
        attempts++;
      }
      
      if (!status) {
        throw new Error("Failed to get connection status after multiple attempts");
      }
      
      setSpotifyStatus({
        isLoading: false,
        connected: status.connected,
        expired: status.expired,
        username: status.username,
        lastRefreshed: Date.now()
      });
      
      if (justConnected && status.connected && showToast) {
        toast({
          title: 'Spotify Connection Verified',
          description: `You're successfully connected as ${status.username || 'a Spotify user'}.`,
        });
      }

      if (showToast && !justConnected) {
        if (status.connected) {
          toast({
            title: 'Connection Status Updated',
            description: `You're connected to Spotify as ${status.username || 'a user'}.`,
          });
        } else {
          toast({
            description: 'Not connected to Spotify.',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Spotify status:', error);
      setSpotifyStatus(prev => ({
        ...prev,
        isLoading: false,
        lastRefreshed: Date.now()
      }));
      
      if (showToast) {
        toast({
          title: 'Error',
          description: 'Failed to fetch Spotify connection status.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [authState.user, searchParams, toast]);

  const handleRefreshStatus = () => {
    fetchSpotifyStatus(true);
  };

  useEffect(() => {
    fetchSpotifyStatus();
    
    // Force a status refresh when the component mounts and whenever the URL parameters change
    // This helps ensure we catch the connection state after a redirect back from Spotify
  }, [fetchSpotifyStatus, location.search]);
  
  // Additional effect to detect when spotify_connected=true is in URL and force a refresh
  useEffect(() => {
    const justConnected = searchParams.get('spotify_connected') === 'true';
    if (justConnected) {
      console.log("Spotify connection detected in URL, forcing status refresh");
      fetchSpotifyStatus(true);
      
      // Set up an interval to check a few times
      const checkInterval = setInterval(() => {
        if (!spotifyStatus.connected) {
          console.log("Retrying Spotify status check...");
          fetchSpotifyStatus(false);
        } else {
          clearInterval(checkInterval);
        }
      }, 1500);
      
      // Clean up
      return () => clearInterval(checkInterval);
    }
  }, [searchParams, fetchSpotifyStatus, spotifyStatus.connected]);

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

  if (!authState.user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <h1 className="text-3xl font-bold mb-4">Settings</h1>
          <p className="mb-6">Please sign in to access your settings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="integrations">
          <TabsList className="mb-6">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          
          <TabsContent value="integrations">
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
                          onClick={handleRefreshStatus}
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div className="font-medium">Email</div>
                    <div>{authState.user.email}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
