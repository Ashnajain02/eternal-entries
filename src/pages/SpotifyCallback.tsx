
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleSpotifyCallback } from '@/services/spotify';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const SpotifyCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authState } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      // Don't process if we're already handling the callback
      if (isProcessing) return;
      
      setIsProcessing(true);
      try {
        console.log("Processing Spotify callback, auth state:", { 
          authenticated: !!authState.session,
          loading: authState.loading,
          userId: authState.session?.user?.id 
        });
        
        // Make sure we have an active session before proceeding
        if (!authState.session) {
          console.log("No session detected, waiting for session load...");
          // Wait longer for session to load as it might be delayed
          if (authState.loading) {
            console.log("Auth is still loading, will wait...");
            return; // Exit but don't set error yet - we'll retry when authState changes
          } else {
            const errorMsg = 'No active session. Please log in and try again.';
            setError(errorMsg);
            console.error(errorMsg);
            
            toast({
              title: 'Authentication Required',
              description: 'Please log in to connect your Spotify account.',
              variant: 'destructive',
            });
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');

        if (errorParam) {
          const errorMsg = `Authorization was denied: ${errorParam}`;
          setError(errorMsg);
          console.error(errorMsg);
          
          toast({
            title: 'Spotify Connection Failed',
            description: 'Authorization was denied or an error occurred.',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        if (!code) {
          const errorMsg = 'No authorization code was provided.';
          setError(errorMsg);
          console.error(errorMsg);
          
          toast({
            title: 'Spotify Connection Failed',
            description: errorMsg,
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        console.log('Processing Spotify callback with code:', code.substring(0, 5) + '...');
        
        try {
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
        } catch (fetchError: any) {
          console.error('Error in fetch operation:', fetchError);
          const errorMessage = fetchError.message || 'Network error while connecting to Spotify';
          setError(`Error: ${errorMessage}`);
          
          // Show detailed error information if available
          if (fetchError.details) {
            setErrorDetails(JSON.stringify(fetchError.details));
          }
          
          // Show a more descriptive toast
          toast({
            title: 'Connection Error',
            description: `${errorMessage} ${retryCount < 2 ? '- Retrying...' : ''}`,
            variant: 'destructive',
          });
          
          // Auto retry up to 2 times
          if (retryCount < 2) {
            setRetryCount(prevCount => prevCount + 1);
            setIsProcessing(false); // Allow retry
            setTimeout(processCallback, 2000); // Retry after 2 seconds
          } else {
            // After retries, suggest to try again
            toast({
              title: 'Connection Failed',
              description: 'Please check your connection and try again.',
              variant: 'destructive',
            });
            setTimeout(() => navigate('/settings'), 5000);
          }
        }
      } catch (err: any) {
        console.error('Error processing Spotify callback:', err);
        setError('An unexpected error occurred: ' + (err.message || 'Unknown error'));
        if (err.details) {
          setErrorDetails(JSON.stringify(err.details));
        }
        
        toast({
          title: 'Spotify Connection Error',
          description: err.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings'), 5000);
      } finally {
        setIsLoading(false);
        setIsProcessing(false);
      }
    };

    // Only process if we have a session or auth loading has completed
    if (!isProcessing && (!authState.loading || authState.session)) {
      processCallback();
    }
  }, [navigate, toast, authState, isProcessing, retryCount]);

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
            {errorDetails && (
              <div className="mt-4 p-2 bg-muted rounded-md overflow-auto text-left">
                <p className="text-xs font-mono break-all">{errorDetails}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {error.includes('log in') ? 
                'Redirecting to login...' : 
                (error.includes('Network') || error.includes('fetch')) ? 
                'Please check your connection and try again.' : 
                'Redirecting back to settings...'}
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
