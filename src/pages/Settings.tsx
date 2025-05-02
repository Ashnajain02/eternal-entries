
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
  const [retryCount, setRetryCount] = useState(0);

  const fetchSpotifyStatus = useCallback(async (showToast = false) => {
    try {
      if (!authState.user) return;
      
      setIsRefreshing(true);
      
      // Check if we just came from a successful connection
      const justConnected = searchParams.get('spotify_connected') === 'true';
      if (justConnected) {
        console.log("Detected successful Spotify connection from URL param, refreshing status...");
        // Add a small delay to allow the database to update
        await new Promise(resolve => setTimeout(resolve, 1500));
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
          await new Promise(resolve => setTimeout(resolve, 1000));
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
      
      return status.connected;
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
      
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [authState.user, searchParams, toast]);

  const handleRefreshStatus = () => {
    setRetryCount(0);
    fetchSpotifyStatus(true);
  };

  // Main effect for status checking
  useEffect(() => {
    fetchSpotifyStatus();
  }, [fetchSpotifyStatus, location.search]);
  
  // Additional effect to detect when spotify_connected=true is in URL and force a refresh
  useEffect(() => {
    const justConnected = searchParams.get('spotify_connected') === 'true';
    if (justConnected) {
      console.log("Spotify connection detected in URL, forcing status refresh");
      
      // Initial attempt
      fetchSpotifyStatus(true).then(connected => {
        // If not connected on first try, set up retry mechanism
        if (!connected && retryCount < 5) {
          console.log(`Spotify status not connected, setting up retry #${retryCount + 1}`);
          
          // Retry with increasing delay
          const retryTimer = setTimeout(() => {
            console.log(`Executing retry #${retryCount + 1} for Spotify status`);
            setRetryCount(prev => prev + 1);
            fetchSpotifyStatus(true);
          }, 2000 + (retryCount * 1000)); // Increasing delay for each retry
          
          return () => clearTimeout(retryTimer);
        }
      });
    }
  }, [searchParams, fetchSpotifyStatus, retryCount]);
  
  // Reset retry count when leaving the page
  useEffect(() => {
    return () => setRetryCount(0);
  }, []);

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
