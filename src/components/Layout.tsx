
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AuthButtons } from './AuthButtons';
import { Notebook, Archive, BarChart3, Settings, Menu, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (pathname: string) => {
    return location.pathname === pathname;
  };

  // Check if the current route is the auth page
  const isAuthPage = location.pathname === '/auth';

  const navLinks = [
    { to: '/', icon: Notebook, label: 'Journal' },
    { to: '/archive', icon: Archive, label: 'Archive' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-x-0 top-0 border-b border-border/50 bg-background/80 backdrop-blur-sm z-50">
        <div className="container px-4 flex items-center justify-between h-14 md:h-16">
          <Link to="/" className="font-display text-lg md:text-xl tracking-tight text-foreground">
            Eternal Entries
          </Link>
          
          <div className="flex items-center gap-2 md:gap-6">
            {/* Desktop Navigation */}
            {!isAuthPage && !isMobile && (
              <nav className="flex items-center space-x-1">
                {navLinks.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200",
                      isActive(to)
                        ? "text-foreground bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-body">{label}</span>
                  </Link>
                ))}
              </nav>
            )}
            
            {/* Mobile Menu Button */}
            {!isAuthPage && isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
            
            <AuthButtons />
          </div>
        </div>
        
        {/* Mobile Navigation Dropdown */}
        {!isAuthPage && isMobile && mobileMenuOpen && (
          <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm">
            <nav className="container px-4 py-3 flex flex-col gap-1">
              {navLinks.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-all duration-200",
                    isActive(to)
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-body">{label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
      <main className="container px-4 pt-20 md:pt-24 pb-16">{children}</main>
    </div>
  );
};

export default Layout;
