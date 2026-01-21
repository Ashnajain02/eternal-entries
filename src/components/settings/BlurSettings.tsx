import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const BlurSettings: React.FC = () => {
  const { authState } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['blur-settings', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('disable_song_blur')
        .eq('id', authState.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching blur preferences:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!authState.user
  });

  const updateBlurSetting = useMutation({
    mutationFn: async (disableBlur: boolean) => {
      if (!authState.user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ disable_song_blur: disableBlur })
        .eq('id', authState.user.id);
      
      if (error) throw error;
      return disableBlur;
    },
    onSuccess: (disableBlur) => {
      queryClient.invalidateQueries({ queryKey: ['blur-settings'] });
      toast({
        title: disableBlur ? "Blur disabled" : "Blur enabled",
        description: disableBlur 
          ? "Journal text will always be visible, even with attached songs."
          : "Journal text will be blurred until the song is played."
      });
    },
    onError: (error) => {
      console.error('Error updating blur setting:', error);
      toast({
        title: "Error",
        description: "Failed to update blur setting.",
        variant: "destructive"
      });
    }
  });

  const handleToggle = (checked: boolean) => {
    updateBlurSetting.mutate(checked);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Display</CardTitle>
        <CardDescription>
          Control how journal entries with songs are displayed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-md border p-4">
          <div className="space-y-0.5 flex-1 mr-4">
            <Label htmlFor="disable-blur" className="font-medium">
              Always show journal text
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, journal entries will be visible without needing to play the attached song first
            </p>
          </div>
          <Switch
            id="disable-blur"
            checked={profile?.disable_song_blur ?? false}
            onCheckedChange={handleToggle}
            disabled={isLoading || updateBlurSetting.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
};