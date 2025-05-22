
import React, { useState, useEffect } from 'react';
import { Music, PlayCircle } from 'lucide-react';

interface BlurredContentProps {
  content: string;
  isBlurred: boolean;
  onPlayRequest?: () => void;
}

const BlurredContent: React.FC<BlurredContentProps> = ({ 
  content, 
  isBlurred, 
  onPlayRequest 
}) => {
  if (!isBlurred) {
    return <div className="whitespace-pre-wrap text-left">{content}</div>;
  }

  return (
    <div className="relative">
      <div 
        className="whitespace-pre-wrap text-left blur-md select-none" 
        aria-hidden="true"
      >
        {content}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/50 rounded-md">
        <PlayCircle className="h-12 w-12 text-primary animate-pulse" />
        <div className="flex items-center gap-2 text-center font-medium">
          <Music className="h-4 w-4" />
          <span>Start playing the attached song to reveal this entry</span>
        </div>
        {onPlayRequest && (
          <button 
            onClick={onPlayRequest}
            className="mt-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Play Track
          </button>
        )}
      </div>
    </div>
  );
};

export default BlurredContent;
