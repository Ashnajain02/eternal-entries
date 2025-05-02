
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { UserRound, LogOut } from 'lucide-react';

export const AuthButtons: React.FC = () => {
  const { authState, signOut } = useAuth();
  const isAuthenticated = !!authState.user;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // The error is already handled in the AuthContext
    }
  };

  if (isAuthenticated) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex items-center gap-2" 
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    );
  }

  return (
    <Link to="/auth">
      <Button variant="ghost" size="sm" className="flex items-center gap-2">
        <UserRound className="h-4 w-4" />
        Sign In
      </Button>
    </Link>
  );
};
