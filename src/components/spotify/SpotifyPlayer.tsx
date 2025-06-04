
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
  const [useFallback, setUseFallback] = useState(false);
  
  // Extract track ID from URI for iframe fallback
  const trackId = track.uri ? track.uri.split(':').pop() : '';
  
  const handleSDKError = () => {
    console.log('Falling back to iframe player');
    setUseFallback(true);
  };

  if (useFallback && trackId) {
    return (
      <div className={`spotify-player ${className}`}>
        <iframe
          src={`https://open.spotify.com/embed/track/${trackId}`}
          width="100%"
          height="152"
          frameBorder="0"
          allow="encrypted-media"
          loading="lazy"
          className="rounded-md"
        />
      </div>
    );
  }
  
  return (
    <SpotifyWebPlayer 
      track={track} 
      className={className}
      onPlayStateChange={onPlayStateChange}
    />
  );
};

export default SpotifyPlayer;
