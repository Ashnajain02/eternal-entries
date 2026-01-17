
import React, { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthState, SignUpMetadata } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

const initialState: AuthState = {
  session: null,
  user: null,
  loading: true,
};

export const useAuthProvider = () => {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, !!session);
        setAuthState({
          session,
          user: session?.user ?? null,
          loading: false,
        });
        
        // Show toast for certain auth events
        if (event === 'PASSWORD_RECOVERY') {
          toast({
            title: "Recovery link detected",
            description: "You can now set a new password.",
          });
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', !!session);
      setAuthState({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const signUp = async (email: string, password: string, metadata?: SignUpMetadata) => {
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: metadata
        }
      });
      if (error) throw error;
      toast({
        title: "Success!",
        description: "Check your email for verification.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign up",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({
        title: "Welcome back!",
        description: "You've been signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // First clear the local auth state immediately
      setAuthState({
        session: null,
        user: null,
        loading: false,
      });
      
      // Check if there's an active session before attempting to sign out
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Sign out globally to invalidate the session on the server
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        
        if (error) {
          console.error('Sign out error:', error);
          // Don't throw for session-related errors
          if (!error.message?.includes('session') && !error.message?.includes('Session')) {
            throw error;
          }
        }
      } else {
        console.log('No active session found, clearing local state only');
      }
      
      console.log('Sign out completed successfully');
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      
      // Even if there's an error, we already cleared local state above
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
    }
  };
  
  const resetPassword = async (email: string, redirectTo?: string) => {
    try {
      // Get the current base URL
      const baseUrl = window.location.origin;
      
      // Create the full reset URL with the current origin
      const resetUrl = redirectTo || `${baseUrl}/auth?tab=update-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset password email",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const updatePassword = async (
    password: string, 
    accessToken?: string | null, 
    refreshToken?: string | null
  ) => {
    try {
      let error;
      
      // If we have tokens from a recovery flow, set the session first
      if (accessToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        
        if (sessionError) {
          throw sessionError;
        }
      }
      
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      error = updateError;
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword
  };
};
