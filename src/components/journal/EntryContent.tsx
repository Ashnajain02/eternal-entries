
import React from 'react';
import BlurredContent from './BlurredContent';

interface EntryContentProps {
  content: string;
  isBlurred?: boolean;
  className?: string;
}

const EntryContent: React.FC<EntryContentProps> = ({ 
  content,
  isBlurred = false,
  className = ''
}) => {
  return (
    <BlurredContent 
      content={content} 
      isBlurred={isBlurred} 
      className={className} 
    />
  );
};

export default EntryContent;
