
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error(`Authentication failed: ${error}`);
      navigate('/settings');
      return;
    }

    if (!code) {
      toast.error('No authorization code received');
      navigate('/settings');
      return;
    }

    toast.success('Successfully authenticated with Spotify. Redirecting...');
    navigate(`/spotify-callback?code=${code}&state=${searchParams.get('state') || ''}`);
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p>Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
};

export default Callback;
