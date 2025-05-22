
import React, { useState, useEffect, useRef } from 'react';
import { SpotifyTrack } from '@/types';
import { Play } from 'lucide-react';

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
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    // Listen for messages from the Spotify iframe
    const handleMessage = (event: MessageEvent) => {
      // Only process messages from Spotify
      if (event.origin !== "https://open.spotify.com") return;
      
      try {
        // Parse the message data if it's a string
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;
        
        // Check if this is a player state update
        if (data && data.type === "player_state_changed") {
          const newIsPlaying = !!(data.payload && !data.payload.paused);
          
          // Update state if it changed
          if (newIsPlaying !== isPlaying) {
            setIsPlaying(newIsPlaying);
            
            // Notify parent component about play state change
            if (onPlayStateChange) {
              console.log(`Spotify player state changed: ${newIsPlaying ? 'playing' : 'paused'}`);
              onPlayStateChange(newIsPlaying);
            }
          }
        }
      } catch (error) {
        // Silently ignore parsing errors
        console.error("Error processing Spotify message:", error);
      }
    };

    // Add event listener
    window.addEventListener('message', handleMessage);

    // Clean up
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isPlaying, onPlayStateChange]);
  
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
