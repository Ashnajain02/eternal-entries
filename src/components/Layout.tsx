
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

const NavLink: React.FC<NavLinkProps> = ({ to, children, className }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link to={to}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start",
          isActive ? "bg-muted font-medium" : "font-normal",
          className
        )}
      >
        {children}
      </Button>
    </Link>
  );
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container flex h-16 items-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold">Song Weather Journal</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4">
            <NavLink to="/">Journal</NavLink>
            <NavLink to="/archive">Archive</NavLink>
            <NavLink to="/stats">Stats</NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 container py-8 px-4">
        {children}
      </main>
      <footer className="border-t py-6 bg-background">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Song Weather Journal. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;
