
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
      // Check if there's a valid session
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        // If no session, just update the local state
        setAuthState({
          session: null,
          user: null,
          loading: false,
        });
        toast({
          title: "Signed out",
          description: "You've been signed out successfully.",
        });
        return;
      }
      
      // Proceed with signout if we have a session
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
      
      // Even if there's an error, we should still reset the local auth state
      setAuthState({
        session: null,
        user: null,
        loading: false,
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
