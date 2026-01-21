
import React, { useState, useEffect, useRef } from 'react';
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
  const [authReady, setAuthReady] = useState(false);
  const authReadySetRef = useRef(false); // Ensures authReady only flips to true ONCE
  const { toast } = useToast();

  const forceClearSupabaseAuthStorage = () => {
    if (typeof window === 'undefined') return;

    const projectRef = 'veorhexddrwlwxtkuycb';
    const prefix = `sb-${projectRef}-`;

    const clearFromStorage = (storage: Storage) => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        if (key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => storage.removeItem(k));
    };

    try {
      clearFromStorage(window.localStorage);
    } catch {
      // ignore
    }

    try {
      clearFromStorage(window.sessionStorage);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // onAuthStateChange handles all auth state updates including INITIAL_SESSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, !!session);
        setAuthState({
          session,
          user: session?.user ?? null,
          loading: false,
        });
        
        // authReady becomes true ONLY ONCE after auth has fully settled with a valid session
        // This happens on INITIAL_SESSION (page load with existing session) or SIGNED_IN (fresh login)
        // Once true, it NEVER flips back to false
        if (!authReadySetRef.current && session?.access_token) {
          console.log('🔐 AUTH_READY: Auth fully settled with access_token');
          authReadySetRef.current = true;
          setAuthReady(true);
        }
        
        if (event === 'PASSWORD_RECOVERY') {
          toast({
            title: "Recovery link detected",
            description: "You can now set a new password.",
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const signUp = async (email: string, password: string, metadata?: SignUpMetadata) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: metadata,
          emailRedirectTo: redirectUrl
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
    console.log('Starting sign out process...');

    // Clear local auth state immediately so UI updates right away
    setAuthState({
      session: null,
      user: null,
      loading: false,
    });

    // Stop background refresh first to avoid tokens being refreshed while logging out
    try {
      supabase.auth.stopAutoRefresh();
    } catch {
      // ignore
    }

    // Force-clear any persisted auth data regardless of server logout status
    forceClearSupabaseAuthStorage();

    try {
      // Attempt to sign out (this may 403 if session already missing server-side)
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.warn('Supabase signOut returned error (continuing):', error);
      }
    } catch (error) {
      // We still consider the user signed out locally
      console.warn('Supabase signOut threw (continuing):', error);
    } finally {
      // Ensure storage is cleared even if signOut failed
      forceClearSupabaseAuthStorage();
    }

    console.log('Sign out completed successfully');
    toast({
      title: 'Signed out',
      description: "You've been signed out successfully.",
    });
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
    authReady,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword
  };
};
