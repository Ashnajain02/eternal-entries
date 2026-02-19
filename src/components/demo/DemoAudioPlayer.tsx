import React, { useState } from 'react';
import { DemoTrack } from '@/data/demoEntries';
import { cn } from '@/lib/utils';

interface DemoAudioPlayerProps {
  track: DemoTrack;
  onPlay?: () => void;
  className?: string;
}

// Extract Spotify track ID from URI (spotify:track:XXXX) or use id directly
function getTrackId(track: DemoTrack): string {
  if (track.uri.startsWith('spotify:track:')) {
    return track.uri.replace('spotify:track:', '');
  }
  return track.id;
}

const DemoAudioPlayer: React.FC<DemoAudioPlayerProps> = ({ track, onPlay, className }) => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const trackId = getTrackId(track);
  const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;

  const handleClick = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      onPlay?.();
    }
  };

  return (
    <div className={cn('rounded-md overflow-hidden', className)} onClick={handleClick}>
      <iframe
        src={embedUrl}
        width="100%"
        height="80"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={`${track.name} by ${track.artist}`}
        style={{ borderRadius: '8px', display: 'block' }}
      />
    </div>
  );
};

export default DemoAudioPlayer;
