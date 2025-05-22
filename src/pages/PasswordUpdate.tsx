
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';
import Layout from '@/components/Layout';

const PasswordUpdate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Check for recovery token in URL hash (for recovery links)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (accessToken && type === 'recovery') {
        setRecoveryToken(accessToken);
        // Clean the URL to remove the token for security
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);
  
  const handleBackToSignIn = () => {
    navigate('/auth');
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto my-16">
        <h1 className="text-3xl font-bold mb-6">Update Password</h1>
        <UpdatePasswordForm 
          onBackToSignIn={handleBackToSignIn}
          recoveryToken={recoveryToken}
        />
      </div>
    </Layout>
  );
};

export default PasswordUpdate;
