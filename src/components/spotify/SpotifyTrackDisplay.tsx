
import React from 'react';
import { SpotifyTrack } from '@/types';
import { Button } from '@/components/ui/button';
import { Music, X } from 'lucide-react';

interface SpotifyTrackDisplayProps {
  track: SpotifyTrack;
  onRemove?: () => void;
  showRemoveButton?: boolean;
  className?: string;
}

const SpotifyTrackDisplay: React.FC<SpotifyTrackDisplayProps> = ({
  track,
  onRemove,
  showRemoveButton = true,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-3 p-3 bg-muted/50 rounded-md ${className}`}>
      {track.albumArt ? (
        <img
          src={track.albumArt}
          alt={track.album}
          className="h-12 w-12 object-cover rounded-sm"
        />
      ) : (
        <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-sm">
          <Music className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{track.name}</p>
        <p className="text-sm text-muted-foreground truncate">
          {track.artist} • {track.album}
        </p>
      </div>
      {showRemoveButton && onRemove && (
        <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8">
          <X className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      )}
    </div>
  );
};

export default SpotifyTrackDisplay;
