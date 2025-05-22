
import React from 'react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import Layout from '@/components/Layout';

const PasswordReset = () => {
  return (
    <Layout>
      <div className="max-w-md mx-auto my-16">
        <h1 className="text-3xl font-bold mb-6">Reset Password</h1>
        <ResetPasswordForm />
      </div>
    </Layout>
  );
};

export default PasswordReset;
