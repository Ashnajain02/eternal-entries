
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

const SettingsLink: React.FC = () => {
  return (
    <div className="flex justify-end mb-4">
      <Link to="/settings">
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Button>
      </Link>
    </div>
  );
};

export default SettingsLink;
