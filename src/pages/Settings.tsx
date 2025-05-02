import React, { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import { getSpotifyConnectionStatus } from '@/services/spotify';
import { useLocation, useSearchParams } from 'react-router-dom';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import { AccountSettings } from '@/components/settings/AccountSettings';

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
            <IntegrationsSettings 
              spotifyStatus={spotifyStatus}
              setSpotifyStatus={setSpotifyStatus}
              onRefreshSpotify={handleRefreshStatus}
              isRefreshing={isRefreshing}
            />
          </TabsContent>
          
          <TabsContent value="account">
            <AccountSettings user={authState.user} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
