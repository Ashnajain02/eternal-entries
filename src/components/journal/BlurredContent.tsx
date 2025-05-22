
import React from 'react';
import { cn } from '@/lib/utils';

interface BlurredContentProps {
  content: string;
  isBlurred: boolean;
  className?: string;
}

const BlurredContent: React.FC<BlurredContentProps> = ({ 
  content, 
  isBlurred,
  className = ''
}) => {
  return (
    <div className="mb-6">
      <div 
        className={cn(
          "whitespace-pre-wrap text-left transition-all duration-500", 
          isBlurred && "blur-md select-none", 
          className
        )}
      >
        {content}
      </div>
      {isBlurred && (
        <div className="text-center text-sm mt-2 text-muted-foreground">
          Start playing the attached song to reveal this entry
        </div>
      )}
    </div>
  );
};

export default BlurredContent;
