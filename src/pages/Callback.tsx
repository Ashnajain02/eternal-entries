
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleSpotifyCallback } from '@/services/spotify';
import { useToast } from '@/hooks/use-toast';

const Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const code = searchParams.get('code');
    
    const processCallback = async () => {
      if (code) {
        try {
          const success = await handleSpotifyCallback(code);
          
          if (success) {
            toast({
              title: "Spotify Connected",
              description: "Your Spotify account has been successfully connected.",
            });
          } else {
            toast({
              title: "Connection Failed",
              description: "Failed to connect your Spotify account. Please try again.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error processing Spotify callback:", error);
          toast({
            title: "Connection Error",
            description: "An error occurred while connecting to Spotify.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Authentication Error",
          description: "No authorization code received from Spotify.",
          variant: "destructive",
        });
      }
      
      // Redirect back to settings page regardless of outcome
      navigate('/settings');
    };
    
    processCallback();
  }, [searchParams, navigate, toast]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Connecting to Spotify...</h1>
        <p className="text-muted-foreground">Please wait while we complete the connection.</p>
      </div>
    </div>
  );
};

export default Callback;
