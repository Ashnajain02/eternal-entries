import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { handleSpotifyCallback } from '@/services/spotify';
import { useToast } from '@/hooks/use-toast';

// Key for storing Spotify redirect information
const SPOTIFY_REDIRECT_KEY = 'spotify_redirect_from_journal';

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your request...');
  
  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get the authorization code from the URL
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        
        if (error) {
          setStatus('error');
          setMessage('Authentication was denied or cancelled.');
          return;
        }
        
        if (!code) {
          setStatus('error');
          setMessage('No authorization code found in the callback URL.');
          return;
        }
        
        // Handle the Spotify callback
        const result = await handleSpotifyCallback(code);
        
        if (result.success) {
          setStatus('success');
          setMessage(`Successfully connected to Spotify as ${result.display_name || 'user'}.`);
          
          // Check if we need to redirect back to journal
          const redirectSource = localStorage.getItem(SPOTIFY_REDIRECT_KEY);
          if (redirectSource === 'journal_editor') {
            // We'll keep the redirect info in localStorage so the journal editor
            // knows we're returning from Spotify connection
            setTimeout(() => {
              navigate('/');
            }, 1500);
          } else {
            // Regular flow - redirect to settings after a short delay
            setTimeout(() => {
              navigate('/settings?tab=integrations');
            }, 1500);
          }
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to connect to Spotify.');
        }
      } catch (error) {
        console.error('Error processing callback:', error);
        setStatus('error');
        setMessage('An unexpected error occurred while processing your request.');
      }
    };
    
    processCallback();
  }, [location, navigate, toast]);
  
  return (
    <Layout>
      <div className="max-w-md mx-auto py-16">
        <Card className="p-8">
          <div className="text-center space-y-4">
            {status === 'loading' && (
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            )}
            
            <h1 className={`text-2xl font-semibold ${
              status === 'success' ? 'text-green-600' 
              : status === 'error' ? 'text-red-600' 
              : ''
            }`}>
              {status === 'success' ? 'Success!' 
               : status === 'error' ? 'Error' 
               : 'Processing'}
            </h1>
            
            <p className="text-muted-foreground">
              {message}
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Callback;
