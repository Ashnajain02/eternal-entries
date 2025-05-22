
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import Layout from '@/components/Layout';

const PasswordReset = () => {
  const navigate = useNavigate();
  
  const handleBackToSignIn = () => {
    navigate('/auth');
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto my-16">
        <h1 className="text-3xl font-bold mb-6">Reset Password</h1>
        <ResetPasswordForm 
          onBackToSignIn={handleBackToSignIn}
          tokenError={false}
        />
      </div>
    </Layout>
  );
};

export default PasswordReset;
