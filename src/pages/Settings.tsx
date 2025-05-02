
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import { getSpotifyConnectionStatus, openSpotifyAuthWindow, disconnectSpotify } from '@/services/spotify';
import { Loader2, Music, Check, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Settings = () => {
  const { authState } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [spotifyStatus, setSpotifyStatus] = useState<{
    isLoading: boolean;
    connected: boolean;
    expired: boolean;
    username: string | null;
  }>({
    isLoading: true,
    connected: false,
    expired: false,
    username: null,
  });

  useEffect(() => {
    const fetchSpotifyStatus = async () => {
      try {
        if (!authState.user) return;
        
        // Check if we just came from a successful connection
        const justConnected = location.search.includes('spotify_connected=true');
        if (justConnected) {
          console.log("Detected successful Spotify connection, refreshing status...");
          // Add a small delay to allow the database to update
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log("Fetching Spotify connection status...");
        const status = await getSpotifyConnectionStatus();
        console.log("Received Spotify status:", status);
        
        setSpotifyStatus({
          isLoading: false,
          connected: status.connected,
          expired: status.expired,
          username: status.username,
        });
        
        if (justConnected && status.connected) {
          toast({
            title: 'Spotify Connection Verified',
            description: `You're successfully connected as ${status.username || 'a Spotify user'}.`,
          });
        }
      } catch (error) {
        console.error('Error fetching Spotify status:', error);
        setSpotifyStatus({
          isLoading: false,
          connected: false,
          expired: false,
          username: null,
        });
      }
    };

    fetchSpotifyStatus();
    
    // Also refetch when location changes (to catch redirects from spotify-callback)
  }, [authState.user, location.search, toast]);

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
                      
                      <div className="flex items-center">
                        {spotifyStatus.isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
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
