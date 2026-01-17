
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
  
  const trackId = track.uri ? track.uri.split(':').pop() : '';
  
  if (!trackId) return null;

  const handleOverlayClick = () => {
    setShowOverlay(false);
    if (onPlayerClick) {
      onPlayerClick();
    }
  };
  
  return (
    <div className={`relative rounded-md overflow-hidden ${className}`}>
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}?theme=0`}
        width="100%"
        height="80"
        frameBorder="0"
        allow="encrypted-media"
        loading="lazy"
        className="rounded-md"
        style={{ backgroundColor: 'transparent' }}
      />
      
      {showOverlay && (
        <div 
          className="absolute inset-0 cursor-pointer rounded-md"
          onClick={handleOverlayClick}
        />
      )}
    </div>
  );
};

export default SpotifyPlayer;
