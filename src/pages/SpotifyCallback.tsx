
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleSpotifyCallback } from '@/services/spotify';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const SpotifyCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authState } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Make sure we have an active session before proceeding
        if (!authState.session) {
          // Set a small delay to see if the session loads
          const waitForSession = setTimeout(() => {
            if (!authState.session) {
              setError('No active session. Please log in and try again.');
              toast({
                title: 'Authentication Required',
                description: 'Please log in to connect your Spotify account.',
                variant: 'destructive',
              });
              setTimeout(() => navigate('/auth'), 3000);
            }
          }, 1500);
          
          return () => clearTimeout(waitForSession);
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
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

        console.log('Processing Spotify callback with code:', code);
        const result = await handleSpotifyCallback(code);
        
        if (result.success) {
          console.log('Spotify connection successful:', result);
          setSuccess(true);
          
          toast({
            title: 'Spotify Connected!',
            description: `Successfully connected as ${result.display_name || 'User'}.`,
          });
          
          // Close this window if it's a popup
          if (window.opener && !window.opener.closed) {
            // If it's a popup, notify the opener that the connection was successful
            window.opener.postMessage({ 
              type: 'SPOTIFY_CONNECTED', 
              success: true, 
              display_name: result.display_name 
            }, window.location.origin);
            
            setTimeout(() => {
              window.opener.focus();
              window.close();
            }, 1000);
          } else {
            // Otherwise navigate back to settings after a short delay
            setTimeout(() => navigate('/settings'), 2000);
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
      } catch (err) {
        console.error('Error processing Spotify callback:', err);
        setError('An unexpected error occurred: ' + (err.message || 'Unknown error'));
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

    if (authState.session || !authState.loading) {
      processCallback();
    }
  }, [navigate, toast, authState]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Connecting to Spotify</h1>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Processing your Spotify authorization...</p>
            {authState.loading && <p className="text-sm text-muted-foreground">Waiting for authentication...</p>}
          </div>
        ) : error ? (
          <div className="text-destructive">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting{error.includes('log in') ? ' to login' : ' back to settings'}...
            </p>
          </div>
        ) : success ? (
          <div className="text-green-500">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
            <p>Successfully connected to Spotify!</p>
            <p className="text-sm text-muted-foreground mt-2">
              {window.opener ? 'You can close this window now.' : 'Redirecting back to settings...'}
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default SpotifyCallback;
