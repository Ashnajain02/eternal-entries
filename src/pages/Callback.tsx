import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { handleSpotifyCallback } from '@/services/spotify';
import { SPOTIFY_REDIRECT_KEY } from '@/constants/spotify';

type CallbackStatus = 'loading' | 'success' | 'error';

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [message, setMessage] = useState('Connecting to Spotify...');
  
  useEffect(() => {
    const processCallback = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (error) {
        setStatus('error');
        setMessage('Authentication was denied or cancelled.');
        redirectAfterDelay('/settings?tab=integrations');
        return;
      }
      
      if (!code) {
        setStatus('error');
        setMessage('No authorization code found.');
        redirectAfterDelay('/settings?tab=integrations');
        return;
      }
      
      const result = await handleSpotifyCallback(code);
      
      if (result.success) {
        setStatus('success');
        setMessage(`Connected as ${result.display_name || 'user'}`);
        
        // Determine redirect destination
        const redirectSource = localStorage.getItem(SPOTIFY_REDIRECT_KEY);
        const destination = redirectSource === 'journal_editor' ? '/' : '/settings?tab=integrations';
        
        // Immediate redirect (short delay just for visual feedback)
        redirectAfterDelay(destination, 500);
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to connect to Spotify.');
        redirectAfterDelay('/settings?tab=integrations');
      }
    };
    
    processCallback();
  }, [location, navigate]);
  
  const redirectAfterDelay = (path: string, delay = 1000) => {
    setTimeout(() => navigate(path), delay);
  };
  
  return (
    <Layout>
      <div className="max-w-md mx-auto py-16">
        <Card className="p-8">
          <div className="text-center space-y-4">
            {status === 'loading' && (
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-10 w-10 mx-auto text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-10 w-10 mx-auto text-destructive" />
            )}
            
            <h1 className={`text-xl font-semibold ${
              status === 'success' ? 'text-green-600' 
              : status === 'error' ? 'text-destructive' 
              : 'text-foreground'
            }`}>
              {status === 'success' ? 'Success!' 
               : status === 'error' ? 'Error' 
               : 'Connecting...'}
            </h1>
            
            <p className="text-muted-foreground">{message}</p>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Callback;
