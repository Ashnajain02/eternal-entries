
import React from 'react';

interface EntryContentProps {
  content: string;
  showPlayMessage?: boolean;
}

const EntryContent: React.FC<EntryContentProps> = ({ content, showPlayMessage = false }) => {
  return (
    <div className="mb-6 relative">
      <div className="whitespace-pre-wrap text-left">{content}</div>
      
      {/* Message overlay when content is blurred */}
      {showPlayMessage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white bg-opacity-90 px-4 py-2 rounded-full text-sm text-gray-800 shadow-md">
            Play the song to begin reading
          </div>
        </div>
      )}
    </div>
  );
};

export default EntryContent;
