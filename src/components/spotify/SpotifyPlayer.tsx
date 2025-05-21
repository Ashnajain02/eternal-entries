
import React from 'react';
import { SpotifyTrack } from '@/types';
import { Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpotifyPlayerProps {
  track: SpotifyTrack;
  className?: string;
  compact?: boolean;
}

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ 
  track, 
  className = '',
  compact = true // Default to compact view
}) => {
  // Extract track ID from URI (format: spotify:track:1234567890)
  const trackId = track.uri ? track.uri.split(':').pop() : '';
  
  if (!trackId) return null;
  
  return (
    <div className={`spotify-player ${className}`}>
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}`}
        width="100%"
        height={compact ? "80" : "152"} // Use a smaller height when compact
        frameBorder="0"
        allow="encrypted-media"
        loading="lazy"
        className={`rounded-md ${compact ? 'spotify-player-compact' : ''}`}
        style={{ maxHeight: compact ? '80px' : '152px' }}
      />
    </div>
  );
};

export default SpotifyPlayer;
