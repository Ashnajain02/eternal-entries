
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleSpotifyCallback } from '@/services/spotify';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const SpotifyCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
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

        // Super detailed debug info
        const debugDetails = `
Callback URL: ${url.toString()}
Code present: ${!!code}
Error present: ${!!errorParam}
Error value: ${errorParam || 'none'}
Origin: ${window.location.origin}
Current hostname: ${window.location.hostname}
Expected redirect URI format: ${window.location.origin}/spotify-callback
Project URL domain: ${window.location.host}
Timestamp: ${new Date().toISOString()}
URL pathname: ${url.pathname}
URL protocol: ${url.protocol}
        `;
        
        setDebugInfo(debugDetails);
        console.log("Spotify callback data:", debugDetails);
        
        if (errorParam) {
          console.error("Spotify auth error parameter:", errorParam);
          setError(`Authorization was denied: ${errorParam}`);
          toast({
            title: 'Spotify Connection Failed',
            description: `Authorization error: ${errorParam}`,
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 5000);
          return;
        }

        if (!code) {
          console.error("No authorization code provided");
          setError('No authorization code was provided.');
          toast({
            title: 'Spotify Connection Failed',
            description: 'No authorization code was provided.',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 5000);
          return;
        }

        console.log("Attempting to exchange code for tokens...");
        const result = await handleSpotifyCallback(code);
        console.log("Spotify callback result:", result);
        
        if (result.success) {
          setSuccess(true);
          setUsername(result.display_name || null);
          
          toast({
            title: 'Spotify Connected!',
            description: `Successfully connected as ${result.display_name || 'User'}.`,
          });
          
          // Wait a moment for the database to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Always navigate back to settings with a refresh flag to ensure the status is refreshed
          navigate('/settings?spotify_connected=true');
        } else {
          // Enhanced error handling
          const errorMessage = result.error || 'Failed to connect to Spotify.';
          const errorDesc = result.error_description || '';
          const fullError = `${errorMessage}${errorDesc ? `: ${errorDesc}` : ''}`;
          
          setError(`${fullError} - This may be due to invalid client credentials or a misconfigured redirect URI.`);
          toast({
            title: 'Spotify Connection Failed',
            description: errorMessage,
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 5000);
        }
      } catch (err: any) {
        console.error('Error processing Spotify callback:', err);
        setError(err.message || 'An unexpected error occurred.');
        toast({
          title: 'Spotify Connection Error',
          description: err.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings'), 5000);
      } finally {
        setIsLoading(false);
      }
    };

    processCallback();
  }, [navigate, toast]);

  const handleGoToSettings = () => {
    navigate('/settings?spotify_connected=true');
  };

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
            <p className="text-destructive mb-4">{error}</p>
            {debugInfo && (
              <div className="mt-4 p-3 bg-muted rounded-md text-left">
                <p className="text-sm font-medium mb-1">Debug Information:</p>
                <pre className="text-xs overflow-auto whitespace-pre-wrap">
                  {debugInfo}
                </pre>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Redirecting back to settings in a few seconds...
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={handleGoToSettings}
            >
              Go to Settings
            </Button>
          </div>
        ) : success ? (
          <div className="text-green-500">
            <p>Successfully connected to Spotify{username ? ` as ${username}` : ''}!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to settings page...
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={handleGoToSettings}
            >
              Go to Settings
            </Button>
          </div>
        ) : (
          <div className="text-amber-500">
            <p>Processing complete but no status available.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={handleGoToSettings}
            >
              Go to Settings
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SpotifyCallback;
