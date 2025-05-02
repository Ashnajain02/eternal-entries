
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleSpotifyCallback } from '@/services/spotifyAuth';
import { Card } from '@/components/ui/card';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const SpotifyCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingStarted, setProcessingStarted] = useState<boolean>(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Only run once - important to prevent multiple token exchanges
    if (processingStarted) return;
    setProcessingStarted(true);

    const processCallback = async () => {
      try {
        // Get the full URL, decode any percent-encoded characters
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        const code = params.get('code');
        const errorParam = params.get('error');
        
        // Log basic diagnostics but don't expose in UI
        console.log("Processing Spotify callback with code present:", !!code);
        console.log("Error present:", !!errorParam);
        
        if (errorParam) {
          console.error("Spotify auth error parameter:", errorParam);
          toast({
            title: 'Spotify Connection Failed',
            description: `Authorization error: ${errorParam}`,
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 1500);
          return;
        }

        if (!code) {
          console.error("No authorization code provided");
          toast({
            title: 'Spotify Connection Failed',
            description: 'No authorization code was provided.',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 1500);
          return;
        }

        console.log("Attempting to exchange code for tokens...");
        
        // Make multiple attempts to exchange the code for tokens
        let attempts = 0;
        let result = null;
        
        while (attempts < 3 && !result?.success) {
          console.log(`Token exchange attempt ${attempts + 1}...`);
          
          result = await handleSpotifyCallback(code);
          console.log(`Attempt ${attempts + 1} result:`, result);
          
          if (!result.success && attempts < 2) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          attempts++;
        }
        
        if (result?.success) {
          toast({
            title: 'Spotify Connected!',
            description: `Successfully connected as ${result.display_name || 'User'}.`,
          });
          
          // Wait a moment for the database to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Use hard navigation with cache-busting timestamp to ensure full page reload
          const timestamp = new Date().getTime();
          window.location.replace(`/settings?spotify_connected=true&t=${timestamp}`);
        } else {
          // Enhanced error handling
          const errorMessage = result?.error || 'Failed to connect to Spotify.';
          const errorDesc = result?.error_description || '';
          
          toast({
            title: 'Spotify Connection Failed',
            description: errorMessage,
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 1500);
        }
      } catch (err: any) {
        console.error('Error processing Spotify callback:', err);
        toast({
          title: 'Spotify Connection Error',
          description: err.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings'), 1500);
      } finally {
        setIsLoading(false);
      }
    };

    processCallback();
  }, [navigate, toast, processingStarted]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Connecting to Spotify</h1>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Processing your Spotify authorization...</p>
          </div>
        ) : error ? (
          <div>
            <div className="flex items-center justify-center mb-4 text-destructive">
              <AlertTriangle className="h-8 w-8 mr-2" />
              <p className="text-lg font-medium">{error}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Redirecting back to settings...
            </p>
          </div>
        ) : (
          <div className="text-green-500 flex flex-col items-center">
            <Check className="h-12 w-12 mb-2" />
            <p className="text-lg">Successfully connected to Spotify!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to settings page...
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SpotifyCallback;
