
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleSpotifyCallback } from '@/services/spotifyAuth';
import { Card } from '@/components/ui/card';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SpotifyCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingStarted, setProcessingStarted] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const verifyProfileUpdate = async (userId: string, displayName: string) => {
    try {
      // First check if the profile exists and has the data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('spotify_username, spotify_access_token')
        .eq('id', userId)
        .single();
        
      if (profileError) {
        setDebugInfo(prev => `${prev}\nProfile verification failed: ${profileError.message}`);
        
        // Try to manually update using the RPC function as a last resort
        setDebugInfo(prev => `${prev}\nAttempting database function update_profile_spotify_data...`);
        
        // Get the tokens from a session scope call
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('spotify-auth', {
          body: {
            action: 'get_tokens_for_userid',
            user_id: userId
          }
        });
        
        if (tokenError || !tokenData) {
          setDebugInfo(prev => `${prev}\nFailed to get tokens: ${tokenError?.message || 'No data'}`);
          return false;
        }
        
        // Use RPC to update the profile
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));
        
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          'update_profile_spotify_data',
          {
            p_user_id: userId,
            p_access_token: tokenData.access_token,
            p_refresh_token: tokenData.refresh_token || '',
            p_expires_at: expiresAt.toISOString(),
            p_username: displayName
          }
        );
        
        if (rpcError) {
          setDebugInfo(prev => `${prev}\nRPC update failed: ${rpcError.message}`);
          return false;
        }
        
        setDebugInfo(prev => `${prev}\nRPC update result: ${rpcResult ? 'SUCCESS' : 'FAILED'}`);
        return rpcResult;
      }
      
      const verification = {
        hasUsername: !!profileData?.spotify_username,
        hasToken: !!profileData?.spotify_access_token,
        username: profileData?.spotify_username
      };
      
      setDebugInfo(prev => `${prev}\nProfile verification: ${JSON.stringify(verification)}`);
      return verification.hasToken && verification.hasUsername;
    } catch (err: any) {
      setDebugInfo(prev => `${prev}\nProfile verification error: ${err.message}`);
      return false;
    }
  };

  useEffect(() => {
    // Only run once - important to prevent multiple token exchanges
    if (processingStarted) return;
    setProcessingStarted(true);

    const processCallback = async () => {
      try {
        // Get user session first to check if we're authenticated
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          setDebugInfo("No active session found when processing callback");
          setError("You must be signed in to connect Spotify");
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
        
        const userId = sessionData.session.user.id;
        setDebugInfo(`Active session for user: ${userId}`);
        
        // Get the full URL, decode any percent-encoded characters
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        const code = params.get('code');
        const errorParam = params.get('error');
        
        // Log basic diagnostics but don't expose in UI
        setDebugInfo(prev => `${prev}\nCode present: ${!!code}`);
        setDebugInfo(prev => `${prev}\nError present: ${!!errorParam}`);
        
        if (errorParam) {
          console.error("Spotify auth error parameter:", errorParam);
          setDebugInfo(prev => `${prev}\nAuth error: ${errorParam}`);
          toast({
            title: 'Spotify Connection Failed',
            description: `Authorization error: ${errorParam}`,
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        if (!code) {
          console.error("No authorization code provided");
          setDebugInfo(prev => `${prev}\nMissing auth code in URL`);
          toast({
            title: 'Spotify Connection Failed',
            description: 'No authorization code was provided.',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        setDebugInfo(prev => `${prev}\nExchanging code for tokens...`);
        
        // Make multiple attempts to exchange the code for tokens
        let attempts = 0;
        let result = null;
        
        while (attempts < 3 && !result?.success) {
          setDebugInfo(prev => `${prev}\nToken exchange attempt ${attempts + 1}...`);
          
          result = await handleSpotifyCallback(code);
          console.log(`Attempt ${attempts + 1} result:`, result);
          setDebugInfo(prev => `${prev}\nAttempt ${attempts + 1}: ${result.success ? 'Success' : 'Failed - ' + (result.error || 'Unknown error')}`);
          
          if (!result.success && attempts < 2) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
          
          attempts++;
        }
        
        if (result?.success) {
          toast({
            title: 'Spotify Connected!',
            description: `Successfully connected as ${result.display_name || 'User'}.`,
          });
          
          setDebugInfo(prev => `${prev}\nConnection reported successful! Username: ${result.display_name || 'Unknown'}`);
          
          // Check if the profile was actually updated in the database
          const verified = await verifyProfileUpdate(userId, result.display_name || 'Spotify User');
          setDebugInfo(prev => `${prev}\nProfile updated successfully: ${verified}`);
          
          if (!verified) {
            setDebugInfo(prev => `${prev}\nWarning: Profile verification failed despite success response`);
            
            // Try direct update as a last resort
            setDebugInfo(prev => `${prev}\nAttempting direct profile update...`);
            try {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  spotify_username: result.display_name
                })
                .eq('id', userId);
                
              if (updateError) {
                setDebugInfo(prev => `${prev}\nManual update failed: ${updateError.message}`);
              } else {
                setDebugInfo(prev => `${prev}\nManual username update succeeded`);
              }
            } catch (err: any) {
              setDebugInfo(prev => `${prev}\nManual update error: ${err.message}`);
            }
          }
          
          // Wait a moment for the database to update
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Use hard navigation with cache-busting timestamp to ensure full page reload
          const timestamp = new Date().getTime();
          window.location.replace(`/settings?spotify_connected=true&t=${timestamp}`);
        } else {
          // Enhanced error handling
          const errorMessage = result?.error || 'Failed to connect to Spotify.';
          const errorDesc = result?.error_description || '';
          
          setError(`${errorMessage}${errorDesc ? `: ${errorDesc}` : ''}`);
          setDebugInfo(prev => `${prev}\nFinal error: ${errorMessage}${errorDesc ? ` - ${errorDesc}` : ''}`);
          
          toast({
            title: 'Spotify Connection Failed',
            description: errorMessage,
            variant: 'destructive',
          });
          setTimeout(() => navigate('/settings'), 3000);
        }
      } catch (err: any) {
        console.error('Error processing Spotify callback:', err);
        setError(err.message || 'An unexpected error occurred.');
        setDebugInfo(prev => `${prev}\nException: ${err.message || 'Unknown error'}`);
        
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
  }, [navigate, toast, processingStarted]);

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
            <div className="flex items-center justify-center mb-4 text-destructive">
              <AlertTriangle className="h-8 w-8 mr-2" />
              <p className="text-lg font-medium">{error}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Redirecting back to settings...
            </p>
          </div>
        ) : (
          <div className="text-green-500 flex flex-col items-center">
            <Check className="h-12 w-12 mb-2" />
            <p className="text-lg">Successfully connected to Spotify!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to settings page...
            </p>
          </div>
        )}
        
        {/* Always show debug info in this version to help troubleshoot */}
        <div className="mt-6 p-3 bg-muted rounded-md">
          <p className="text-xs text-left font-mono whitespace-pre-line">{debugInfo}</p>
        </div>
      </Card>
    </div>
  );
};

export default SpotifyCallback;
