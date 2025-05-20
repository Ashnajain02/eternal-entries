
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleSpotifyCallback } from '@/services/spotify';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const Callback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get the code from URL query params
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const error = params.get('error');
        
        if (error) {
          setStatus('error');
          setErrorMessage(error);
          toast({
            title: "Spotify Connection Failed",
            description: `Authorization error: ${error}`,
            variant: "destructive",
          });
          return;
        }
        
        if (!code) {
          setStatus('error');
          setErrorMessage('Missing authorization code');
          toast({
            title: "Spotify Connection Failed",
            description: "Missing authorization code",
            variant: "destructive",
          });
          return;
        }
        
        // Process the code with our backend
        const result = await handleSpotifyCallback(code);
        
        if (result.error) {
          setStatus('error');
          setErrorMessage(result.error);
          toast({
            title: "Spotify Connection Failed",
            description: result.error,
            variant: "destructive",
          });
          return;
        }
        
        setStatus('success');
        toast({
          title: "Spotify Connected",
          description: "Your Spotify account has been successfully connected",
        });
        
        // Navigate back to the app after a short delay
        setTimeout(() => {
          navigate('/settings');
        }, 2000);
        
      } catch (error) {
        console.error('Error processing Spotify callback:', error);
        setStatus('error');
        setErrorMessage(error.message);
        toast({
          title: "Spotify Connection Failed",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      }
    };
    
    processCallback();
  }, [location, navigate, toast]);
  
  return (
    <Layout>
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Connecting Spotify</h1>
          
          {status === 'processing' && (
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p>Processing your Spotify connection...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div>
              <div className="text-3xl mb-4">🎉</div>
              <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                Spotify connected successfully!
              </p>
              <p>Redirecting you back to the app...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div>
              <div className="text-3xl mb-4">❌</div>
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                Failed to connect Spotify
              </p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Callback;
