
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
  // Extract track ID from URI (format: spotify:track:1234567890)
  const trackId = track.uri ? track.uri.split(':').pop() : '';
  
  if (!trackId) return null;

  const handleClick = () => {
    if (onPlayerClick) {
      onPlayerClick();
    }
  };
  
  return (
    <div className={`spotify-player ${className}`}>
      <div 
        className="spotify-player-wrapper cursor-pointer" 
        onClick={handleClick}
      >
        <iframe
          src={`https://open.spotify.com/embed/track/${trackId}`}
          width="100%"
          height="80"
          frameBorder="0"
          allow="encrypted-media"
          loading="lazy"
          className="rounded-md pointer-events-none"
        />
      </div>
    </div>
  );
};

export default SpotifyPlayer;
