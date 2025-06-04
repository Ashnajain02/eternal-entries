
import React, { useState } from 'react';
import { SpotifyTrack } from '@/types';

interface SpotifyPlayerProps {
  track: SpotifyTrack;
  className?: string;
  onPlayerClick?: () => void;
}

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ 
  track, 
  className = '',
  onPlayerClick
}) => {
  const [showOverlay, setShowOverlay] = useState(true);
  
  // Extract track ID from URI (format: spotify:track:1234567890)
  const trackId = track.uri ? track.uri.split(':').pop() : '';
  
  if (!trackId) return null;

  const handleOverlayClick = () => {
    setShowOverlay(false);
    if (onPlayerClick) {
      onPlayerClick();
    }
  };
  
  return (
    <div className={`spotify-player relative ${className}`}>
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}`}
        width="100%"
        height="80"
        frameBorder="0"
        allow="encrypted-media"
        loading="lazy"
        className="rounded-md"
      />
      
      {/* Transparent overlay that disappears after first click */}
      {showOverlay && (
        <div 
          className="absolute inset-0 cursor-pointer rounded-md flex items-center justify-center bg-black bg-opacity-20 transition-opacity hover:bg-opacity-30"
          onClick={handleOverlayClick}
        >
          <div className="bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm text-gray-800 shadow-md">
            Click to begin reading
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifyPlayer;
