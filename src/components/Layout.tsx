
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AuthButtons } from './AuthButtons';
import { Notebook, Archive, BarChart3, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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

  const navigationItems = [
    { path: '/', icon: Notebook, label: 'Journal' },
    { path: '/archive', icon: Archive, label: 'Archive' },
    { path: '/stats', icon: BarChart3, label: 'Stats' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  const NavigationContent = () => (
    <>
      {navigationItems.map(({ path, icon: Icon, label }) => (
        <Link
          key={path}
          to={path}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm relative z-10",
            isActive(path)
              ? "text-primary font-medium bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background antialiased">
      <div className="fixed inset-x-0 top-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center font-semibold text-lg relative z-10">
            Eternal Entries
          </Link>
          
          <div className="flex items-center space-x-2">
            {/* Desktop Navigation */}
            {!isAuthPage && (
              <nav className="hidden md:flex items-center space-x-1 relative z-10">
                <NavigationContent />
              </nav>
            )}
            
            {/* Mobile Navigation */}
            {!isAuthPage && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden relative z-10">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 z-[100]">
                  <div className="flex flex-col space-y-2 mt-6">
                    <NavigationContent />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            <div className="relative z-10">
              <AuthButtons />
            </div>
          </div>
        </div>
      </div>
      <main className="pt-14 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
