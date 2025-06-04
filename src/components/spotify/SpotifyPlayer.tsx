
import React, { useState } from 'react';
import { SpotifyTrack } from '@/types';
import SpotifyWebPlayer from './SpotifyWebPlayer';

interface SpotifyPlayerProps {
  track: SpotifyTrack;
  className?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ 
  track, 
  className = '',
  onPlayStateChange 
}) => {
  const [useWebPlayer, setUseWebPlayer] = useState(true);
  
  // Extract track ID from URI (format: spotify:track:1234567890)
  const trackId = track.uri ? track.uri.split(':').pop() : '';
  
  if (!trackId) return null;

  // Try Web Player first, fallback to iframe if needed
  if (useWebPlayer) {
    return (
      <SpotifyWebPlayer 
        track={track} 
        className={className}
        onPlayStateChange={onPlayStateChange}
      />
    );
  }
  
  // Fallback iframe player
  return (
    <div className={`spotify-player ${className}`}>
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}`}
        width="100%"
        height="80"
        frameBorder="0"
        allow="encrypted-media"
        loading="lazy"
        className="rounded-md"
      />
    </div>
  );
};

export default SpotifyPlayer;
