
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Sparkles } from 'lucide-react';

interface ReflectionTriggerProps {
  onClick: () => void;
  isLoading: boolean;
}

const ReflectionTrigger: React.FC<ReflectionTriggerProps> = ({ onClick, isLoading }) => {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      className="w-full mt-4"
      variant="outline"
    >
      {isLoading ? (
        <>Generating... <RefreshCcw className="animate-spin ml-2 h-4 w-4" /></>
      ) : (
        <>Generate Reflection Question <Sparkles className="ml-2 h-4 w-4" /></>
      )}
    </Button>
  );
};

export default ReflectionTrigger;
