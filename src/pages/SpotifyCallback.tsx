
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleSpotifyCallback } from '@/services/spotify';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const SpotifyCallback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        
        if (error) {
          setError(`Authentication failed: ${error}`);
          toast({
            title: "Authentication Failed",
            description: `Spotify connection was denied: ${error}`,
            variant: "destructive"
          });
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }
        
        if (!code) {
          setError("No authorization code provided");
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }
        
        const result = await handleSpotifyCallback(code);
        
        if (result.success) {
          toast({
            title: "Spotify Connected",
            description: `Connected as ${result.display_name || 'a Spotify user'}`,
          });
        } else {
          toast({
            title: "Connection Failed",
            description: result.error || "Could not connect to Spotify",
            variant: "destructive",
          });
        }
        
        // Navigate back to settings
        navigate('/settings');
      } catch (error: any) {
        setError(error.message || "An error occurred during authentication");
        console.error("Error in Spotify callback:", error);
        setTimeout(() => navigate('/settings'), 3000);
      } finally {
        setIsProcessing(false);
      }
    };
    
    processCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 text-center">
        {isProcessing ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold mb-2">Connecting to Spotify</h1>
            <p className="text-muted-foreground">Please wait while we complete the authentication...</p>
          </>
        ) : error ? (
          <>
            <div className="text-destructive text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">Redirecting to settings...</p>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default SpotifyCallback;
