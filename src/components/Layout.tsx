
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AuthButtons } from './AuthButtons';
import { Notebook, Archive, BarChart3, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (pathname: string) => {
    return location.pathname === pathname;
  };

  // Check if the current route is the auth page
  const isAuthPage = location.pathname === '/auth';

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-x-0 top-0 border-b border-border/50 bg-background/80 backdrop-blur-sm z-50">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="font-display text-xl tracking-tight text-foreground">
            Eternal Entries
          </Link>
          <div className="flex items-center space-x-6">
            {/* Only show navigation when NOT on auth page */}
            {!isAuthPage && (
              <nav className="flex items-center space-x-1">
                <Link
                  to="/"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200",
                    isActive("/")
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Notebook className="h-4 w-4" />
                  <span className="font-body">Journal</span>
                </Link>
                <Link
                  to="/archive"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200",
                    isActive("/archive")
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Archive className="h-4 w-4" />
                  <span className="font-body">Archive</span>
                </Link>
                <Link
                  to="/stats"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200",
                    isActive("/stats")
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-body">Stats</span>
                </Link>
                <Link 
                  to="/settings" 
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200", 
                    isActive("/settings") 
                      ? "text-foreground bg-accent" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span className="font-body">Settings</span>
                </Link>
              </nav>
            )}
            <AuthButtons />
          </div>
        </div>
      </div>
      <main className="container pt-24 pb-16">{children}</main>
    </div>
  );
};

export default Layout;
