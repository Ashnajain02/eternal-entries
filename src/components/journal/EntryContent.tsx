
import React from 'react';
import BlurredContent from './BlurredContent';

interface EntryContentProps {
  content: string;
  isBlurred?: boolean;
  onPlayRequest?: () => void;
}

const EntryContent: React.FC<EntryContentProps> = ({ 
  content, 
  isBlurred = false,
  onPlayRequest
}) => {
  return (
    <div className="mb-6">
      <BlurredContent 
        content={content} 
        isBlurred={isBlurred} 
        onPlayRequest={onPlayRequest}
      />
    </div>
  );
};

export default EntryContent;
