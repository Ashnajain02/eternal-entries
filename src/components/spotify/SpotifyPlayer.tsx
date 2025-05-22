
import React, { useState, useEffect, useRef } from 'react';
import { SpotifyTrack } from '@/types';

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
  // Extract track ID from URI (format: spotify:track:1234567890)
  const trackId = track.uri ? track.uri.split(':').pop() : '';
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);
  
  useEffect(() => {
    // Setup event listener for messages from the Spotify iframe
    const handleSpotifyEvents = (event: MessageEvent) => {
      // Only process messages from Spotify
      if (event.origin !== 'https://open.spotify.com') return;
      
      try {
        const data = JSON.parse(event.data);
        
        // Check if this is a player event
        if (data && data.type === 'playerStateChanged') {
          const isPlaying = !!(data.payload && data.payload.isPlaying);
          console.log("Spotify player state changed. isPlaying:", isPlaying);
          setIsTrackPlaying(isPlaying);
          
          // Notify parent component about playback state change
          if (onPlayStateChange) {
            onPlayStateChange(isPlaying);
          }
        }
      } catch (error) {
        // Silently fail if the message can't be parsed
      }
    };
    
    // Add event listener
    window.addEventListener('message', handleSpotifyEvents);
    
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('message', handleSpotifyEvents);
    };
  }, [onPlayStateChange]);
  
  if (!trackId) return null;
  
  return (
    <div className={`spotify-player ${className}`}>
      <iframe
        ref={iframeRef}
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
