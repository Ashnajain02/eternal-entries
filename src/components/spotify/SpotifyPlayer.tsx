
import React from 'react';
import { SpotifyTrack } from '@/types';
import SpotifyPlayerSDK from './SpotifyPlayerSDK';

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
  // Use our SDK-based player for better control and accurate state detection
  return (
    <SpotifyPlayerSDK
      track={track}
      className={className}
      onPlayStateChange={onPlayStateChange}
    />
  );
};

export default SpotifyPlayer;
