
import React from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface AccountSettingsProps {
  user: User;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ user }) => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>
          Manage your account information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">
            <div className="font-medium">Email</div>
            <div>{user.email}</div>
          </div>
          
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">
            <div className="font-medium">First Name</div>
            <div>{isLoading ? "Loading..." : profile?.first_name || "Not set"}</div>
          </div>
          
          <div className="flex items-center justify-between rounded-md border p-3 text-sm">
            <div className="font-medium">Last Name</div>
            <div>{isLoading ? "Loading..." : profile?.last_name || "Not set"}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
