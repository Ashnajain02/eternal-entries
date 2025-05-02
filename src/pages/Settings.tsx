import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import { getSpotifyConnectionStatus, openSpotifyAuthWindow, disconnectSpotify, refreshSpotifyToken } from '@/services/spotify';
import { Loader2, Music, Check, X, RefreshCw, AlertCircle } from 'lucide-react';

const Settings = () => {
  const { authState } = useAuth();
  const { toast } = useToast();
  const [spotifyStatus, setSpotifyStatus] = useState<{
    isLoading: boolean;
    isRefreshing: boolean;
    connected: boolean;
    expired: boolean;
    username: string | null;
  }>({
    isLoading: true,
    isRefreshing: false,
    connected: false,
    expired: false,
    username: null,
  });

  const fetchSpotifyStatus = async () => {
    try {
      if (!authState.user) return;
      
      console.log('Fetching Spotify status...');
      const status = await getSpotifyConnectionStatus();
      console.log('Spotify status received:', status);
      
      setSpotifyStatus({
        isLoading: false,
        isRefreshing: false,
        connected: status.connected,
        expired: status.expired,
        username: status.username,
      });
    } catch (error) {
      console.error('Error fetching Spotify status:', error);
      setSpotifyStatus({
        isLoading: false,
        isRefreshing: false,
        connected: false,
        expired: false,
        username: null,
      });
    }
  };

  useEffect(() => {
    if (authState.user) {
      fetchSpotifyStatus();
    }
  }, [authState.user, authState.session]);

  // Listen for Spotify connection messages from popup
  useEffect(() => {
    const handleSpotifyConnected = (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'SPOTIFY_CONNECTED' && event.data.success) {
        console.log('Received Spotify connected message from popup:', event.data);
        // Refresh the status to show the new connection
        fetchSpotifyStatus();
        
        toast({
          title: 'Spotify Connected',
          description: `Your Spotify account has been successfully connected${event.data.display_name ? ` as ${event.data.display_name}` : ''}.`,
        });
      }
    };

    window.addEventListener('message', handleSpotifyConnected);
    return () => {
      window.removeEventListener('message', handleSpotifyConnected);
    };
  }, [toast]);

  const handleConnectSpotify = async () => {
    try {
      // Open Spotify authorization in a new tab
      await openSpotifyAuthWindow();
      
      // Show toast notification
      toast({
        title: 'Spotify Authorization',
        description: 'Please complete the authentication in the new tab. If no tab opened, check your popup blocker.',
      });
    } catch (error) {
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

  const handleRefreshSpotifyToken = async () => {
    try {
      setSpotifyStatus(prev => ({ ...prev, isRefreshing: true }));
      const refreshed = await refreshSpotifyToken();
      
      if (refreshed) {
        // Get updated status
        await fetchSpotifyStatus();
        
        toast({
          title: 'Spotify Reconnected',
          description: 'Your Spotify connection has been refreshed successfully.',
        });
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh Spotify connection. Please try reconnecting.',
        variant: 'destructive',
      });
      setSpotifyStatus(prev => ({ ...prev, isRefreshing: false }));
    }
  };

  const handleDisconnectSpotify = async () => {
    try {
      setSpotifyStatus(prev => ({ ...prev, isLoading: true }));
      const result = await disconnectSpotify();
      
      if (result) {
        setSpotifyStatus({
          isLoading: false,
          isRefreshing: false,
          connected: false,
          expired: false,
          username: null,
        });
        
        toast({
          title: 'Spotify Disconnected',
          description: 'Your Spotify account has been successfully disconnected.',
        });
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
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
                      
                      <div className="flex items-center">
                        {spotifyStatus.isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : spotifyStatus.connected ? (
                          spotifyStatus.expired ? (
                            <div className="flex items-center gap-2 text-sm text-amber-500">
                              <AlertCircle className="h-4 w-4" />
                              <span>Expired</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                              <Check className="h-4 w-4" />
                              <span>Connected</span>
                            </div>
                          )
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
                          
                          <div className="flex justify-end space-x-2">
                            {spotifyStatus.expired && (
                              <Button 
                                variant="outline" 
                                onClick={handleRefreshSpotifyToken}
                                disabled={spotifyStatus.isRefreshing}
                              >
                                {spotifyStatus.isRefreshing ? (
                                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Refresh Connection
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              onClick={handleDisconnectSpotify}
                              disabled={spotifyStatus.isLoading || spotifyStatus.isRefreshing}
                            >
                              {(spotifyStatus.isLoading && !spotifyStatus.isRefreshing) ? (
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
