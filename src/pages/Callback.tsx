
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get the code and state from the URL
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Construct the redirect URL to the spotify-callback page
    const redirectPath = `/spotify-callback${window.location.search}`;
    
    console.log('Spotify callback received, redirecting to SpotifyCallback component');
    console.log('Code:', code);
    console.log('State:', state);
    console.log('Error:', error);
    console.log('Redirecting to:', redirectPath);
    
    // Redirect to the SpotifyCallback component to handle the auth
    navigate(redirectPath, { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md p-6">
        <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
        <p className="text-gray-600">Handling Spotify authentication...</p>
      </div>
    </div>
  );
};

export default Callback;
