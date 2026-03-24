
import React from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Clock } from 'lucide-react';
import { formatDateTimeStamp } from '@/utils/dateUtils';

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

  const { data: visitLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['visit_logs', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Activity Log
          </CardTitle>
          <CardDescription>Your recent visits</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !visitLogs?.length ? (
            <p className="text-sm text-muted-foreground">No visits logged yet.</p>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-4">
                {visitLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between rounded-md border p-3 text-sm"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatDateTimeStamp(log.visited_at)}
                      </div>
                      {(log.city || log.country) && (
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <MapPin className="h-3 w-3" />
                          {[log.city, log.region, log.country].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
