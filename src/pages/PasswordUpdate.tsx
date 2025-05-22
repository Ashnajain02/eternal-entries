
import React from 'react';
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';
import Layout from '@/components/Layout';

const PasswordUpdate = () => {
  return (
    <Layout>
      <div className="max-w-md mx-auto my-16">
        <h1 className="text-3xl font-bold mb-6">Update Password</h1>
        <UpdatePasswordForm />
      </div>
    </Layout>
  );
};

export default PasswordUpdate;
