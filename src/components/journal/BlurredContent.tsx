
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';

interface BlurredContentProps {
  content: string;
  isTrackPlaying: boolean;
  hasTrack: boolean;
}

const BlurredContent: React.FC<BlurredContentProps> = ({ 
  content, 
  isTrackPlaying,
  hasTrack 
}) => {
  const [isBlurred, setIsBlurred] = useState(hasTrack ? true : false);
  const REBLUR_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds
  
  // Timer reference for cleanup
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Effect to handle track playback state changes
  useEffect(() => {
    console.log("BlurredContent: Track playing state changed to", isTrackPlaying);
    
    // If a track is playing, unblur the content
    if (isTrackPlaying && isBlurred) {
      console.log("Removing blur as track is now playing");
      setIsBlurred(false);
      
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Start a new timer to reblur after timeout
      timerRef.current = setTimeout(() => {
        console.log("Re-applying blur after timeout");
        setIsBlurred(true);
      }, REBLUR_TIMEOUT);
    }
    
    // Cleanup timer on component unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTrackPlaying, isBlurred]);
  
  // If there's no track associated, just show the content without blur
  if (!hasTrack) {
    return <div className="whitespace-pre-wrap text-left">{content}</div>;
  }
  
  return (
    <div className="relative">
      {isBlurred ? (
        <>
          <div 
            className="whitespace-pre-wrap text-left blur-md select-none"
            aria-hidden="true"
          >
            {content}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background/80 p-4 rounded-lg text-center">
              <p className="mb-2 font-medium">Play the song to reveal this memory</p>
              <PlayCircle className="h-10 w-10 mx-auto text-primary animate-pulse" />
            </div>
          </div>
        </>
      ) : (
        <div className="whitespace-pre-wrap text-left transition-all duration-500">
          {content}
        </div>
      )}
    </div>
  );
};

export default BlurredContent;
