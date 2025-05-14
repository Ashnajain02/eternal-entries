
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthState } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

// Interface for signup metadata
interface SignUpMetadata {
  first_name?: string;
  last_name?: string;
  [key: string]: any;
}

const initialState: AuthState = {
  session: null,
  user: null,
  loading: true,
};

const AuthContext = createContext<{
  authState: AuthState;
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}>({
  authState: initialState,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const { toast } = useToast();

  useEffect(() => {
    let didCancel = false;
    let subscription: { unsubscribe: () => void } | null = null;

    // Helper function for updating auth state
    const updateAuthState = (session: Session | null) => {
      if (!didCancel) {
        setAuthState({
          session,
          user: session?.user ?? null,
          loading: false,
        });
      }
    };

    const setupAuthSubscription = async () => {
      try {
        // First check for existing session
        const { data: sessionData } = await supabase.auth.getSession();
        updateAuthState(sessionData.session);
        
        // Then set up auth state listener
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state change event:', event);
          // Don't update state if the component is unmounted
          if (!didCancel) {
            updateAuthState(session);
          }
        });
        
        subscription = data.subscription;
      } catch (error) {
        console.error("Error setting up auth subscription:", error);
        if (!didCancel) {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      }
    };

    setupAuthSubscription();

    // Cleanup function
    return () => {
      didCancel = true;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

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
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
      
      // Even if there's an error, we should still reset the local auth state
      // This ensures the UI reflects a signed-out state even if the backend call failed
      setAuthState({
        session: null,
        user: null,
        loading: false,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ authState, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
