
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
        
        // Log all received data for debugging
        console.log('Spotify event received:', data);
        
        // Check if this is a player event
        if (data && data.type === 'playerStateChanged') {
          const isPlaying = !!(data.payload && data.payload.isPlaying);
          console.log('Spotify play state changed:', isPlaying);
          setIsTrackPlaying(isPlaying);
          
          // Notify parent component about playback state change
          if (onPlayStateChange) {
            console.log('Notifying parent about play state change:', isPlaying);
            onPlayStateChange(isPlaying);
          }
        }
      } catch (error) {
        console.error('Error processing Spotify message:', error);
      }
    };
    
    // Add event listener
    window.addEventListener('message', handleSpotifyEvents);
    console.log('Spotify event listener added');
    
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('message', handleSpotifyEvents);
      console.log('Spotify event listener removed');
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
        allow="encrypted-media; autoplay"
        loading="lazy"
        className="rounded-md"
      />
    </div>
  );
};

export default SpotifyPlayer;
