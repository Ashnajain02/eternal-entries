
import React from 'react';

interface EntryContentProps {
  content: string;
}

const EntryContent: React.FC<EntryContentProps> = ({ content }) => {
  return (
    <div className="mb-6">
      <div className="whitespace-pre-wrap text-left">{content}</div>
    </div>
  );
};

export default EntryContent;
