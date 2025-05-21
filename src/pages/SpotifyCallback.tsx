
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleSpotifyCallback } from '@/services/spotify';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Layout from '@/components/Layout';

const SpotifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Spotify authorization...');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('Spotify auth error:', error);
        setStatus('error');
        setMessage(`Authorization failed: ${error}`);
        toast({
          title: 'Spotify Connection Failed',
          description: `Error: ${error}`,
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        toast({
          title: 'Spotify Connection Failed',
          description: 'No authorization code received',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      try {
        const result = await handleSpotifyCallback(code);
        
        if (result.success) {
          setStatus('success');
          setMessage(`Successfully connected to Spotify${result.display_name ? ` as ${result.display_name}` : ''}!`);
          toast({
            title: 'Success!',
            description: `Spotify account connected${result.display_name ? ` as ${result.display_name}` : ''}`,
          });
        } else {
          setStatus('error');
          setMessage(`Connection failed: ${result.error || 'Unknown error'}`);
          toast({
            title: 'Spotify Connection Failed',
            description: result.error || 'Unknown error occurred',
            variant: 'destructive',
          });
        }
        
        // Redirect to settings after a short delay
        setTimeout(() => navigate('/settings'), 3000);
      } catch (err: any) {
        console.error('Error in callback processing:', err);
        setStatus('error');
        setMessage(`Error: ${err.message || 'Unknown error'}`);
        toast({
          title: 'Spotify Connection Failed',
          description: err.message || 'Unknown error occurred',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings'), 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate, toast]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">
            {status === 'loading' ? 'Connecting to Spotify' : 
             status === 'success' ? 'Connection Successful!' : 'Connection Failed'}
          </h1>
          
          {status === 'loading' && (
            <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-green-500" />
          )}
          
          <p className="text-gray-600 mb-4">{message}</p>
          
          <p className="text-sm text-gray-500">
            You'll be redirected to the settings page shortly...
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default SpotifyCallback;
