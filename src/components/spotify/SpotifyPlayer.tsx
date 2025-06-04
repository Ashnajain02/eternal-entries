
import React from 'react';
import { SpotifyTrack } from '@/types';

interface SpotifyPlayerProps {
  track: SpotifyTrack;
  className?: string;
}

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ track, className = '' }) => {
  // Extract track ID from URI (format: spotify:track:1234567890)
  const trackId = track.uri ? track.uri.split(':').pop() : '';
  
  if (!trackId) return null;
  
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
