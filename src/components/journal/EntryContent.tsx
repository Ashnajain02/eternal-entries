
import React from 'react';
import BlurredContent from './BlurredContent';

interface EntryContentProps {
  content: string;
  isTrackPlaying?: boolean;
  hasTrack?: boolean;
}

const EntryContent: React.FC<EntryContentProps> = ({ 
  content,
  isTrackPlaying = false,
  hasTrack = false
}) => {
  return (
    <div className="mb-6">
      <BlurredContent 
        content={content} 
        isTrackPlaying={isTrackPlaying}
        hasTrack={hasTrack}
      />
    </div>
  );
};

export default EntryContent;
