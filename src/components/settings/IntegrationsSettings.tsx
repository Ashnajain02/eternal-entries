
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';

export const IntegrationsSettings: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Services</CardTitle>
        <CardDescription>
          Manage your connected services and integrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-md">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                <Music className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-medium">Spotify</h3>
                <p className="text-sm text-muted-foreground">Not connected</p>
              </div>
            </div>
            <Button variant="outline" disabled>
              Connect
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Spotify integration is being reimplemented. Check back soon!</p>
        </div>
      </CardContent>
    </Card>
  );
};
