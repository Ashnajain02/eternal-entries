
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
    <div className="min-h-screen bg-background antialiased">
      <div className="fixed inset-x-0 top-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center font-semibold text-foreground">
            Eternal Entries
          </Link>
          <div className="flex items-center space-x-4">
            {/* Only show navigation when NOT on auth page */}
            {!isAuthPage && (
              <nav className="flex items-center space-x-2">
                <Link
                  to="/"
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    isActive("/")
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Notebook className="h-4 w-4" />
                  <span>Journal</span>
                </Link>
                <Link
                  to="/archive"
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    isActive("/archive")
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Archive className="h-4 w-4" />
                  <span>Archive</span>
                </Link>
                <Link
                  to="/stats"
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    isActive("/stats")
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Stats</span>
                </Link>
                <Link to="/settings" className={cn("flex items-center gap-2 transition-colors", 
                  isActive("/settings") ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                )}>
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </nav>
            )}
            <AuthButtons />
          </div>
        </div>
      </div>
      <main className="container pt-20 pb-12">{children}</main>
    </div>
  );
};

export default Layout;
