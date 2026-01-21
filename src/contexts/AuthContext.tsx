
import React, { createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { AuthState, SignUpMetadata } from '@/types/auth';
import { useAuthProvider } from '@/hooks/useAuthProvider';

const AuthContext = createContext<{
  authState: AuthState;
  authReady: boolean;
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, redirectTo?: string) => Promise<void>;
  updatePassword: (password: string, accessToken?: string | null, refreshToken?: string | null) => Promise<void>;
}>({
  authState: { session: null, user: null, loading: true },
  authReady: false,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthProvider();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
