
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleSpotifyCallback } from '@/services/spotify';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SpotifyCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get the full URL, decode any percent-encoded characters
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        const code = params.get('code');
        const errorParam = params.get('error');

        if (errorParam) {
          setError('Authorization was denied or an error occurred.');
          toast({
            title: 'Spotify Connection Failed',
            description: 'Authorization was denied or an error occurred.',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        if (!code) {
          setError('No authorization code was provided.');
          toast({
            title: 'Spotify Connection Failed',
            description: 'No authorization code was provided.',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        const result = await handleSpotifyCallback(code);
        
        if (result.success) {
          toast({
            title: 'Spotify Connected!',
            description: `Successfully connected as ${result.display_name || 'User'}.`,
          });
          
          // Close this window if it's a popup
          if (window.opener && !window.opener.closed) {
            window.opener.focus();
            window.close();
          } else {
            // Otherwise navigate back to settings
            navigate('/settings');
          }
        } else {
          setError('Failed to connect to Spotify.');
          toast({
            title: 'Spotify Connection Failed',
            description: 'There was a problem connecting your Spotify account.',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 3000);
        }
      } catch (err: any) {
        console.error('Error processing Spotify callback:', err);
        setError(err.message || 'An unexpected error occurred.');
        toast({
          title: 'Spotify Connection Error',
          description: err.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings'), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    processCallback();
  }, [navigate, toast]);

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
          <div className="text-destructive">
            <p>{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting back to settings...
            </p>
          </div>
        ) : (
          <div className="text-green-500">
            <p>Successfully connected to Spotify!</p>
            <p className="text-sm text-muted-foreground mt-2">
              You can close this window or wait to be redirected...
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SpotifyCallback;
