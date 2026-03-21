import React, { useState } from 'react';
import { SpotifyTrack } from '@/types';
import { Button } from '@/components/ui/button';
import { Music, X } from 'lucide-react';
import TrackSearch from './TrackSearch';

interface MusicSectionProps {
  selectedTrack: SpotifyTrack | null | undefined;
  onTrackSelect: (track: SpotifyTrack | undefined) => void;
}

const MusicSection: React.FC<MusicSectionProps> = ({ selectedTrack, onTrackSelect }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleTrackSelect = (track: SpotifyTrack) => {
    // Default clip: 0 to 30 seconds (or full preview if shorter)
    const durationSeconds = track.durationMs ? Math.floor(track.durationMs / 1000) : 30;
    const clipEnd = Math.min(30, durationSeconds);
    onTrackSelect({
      ...track,
      clipStartSeconds: 0,
      clipEndSeconds: clipEnd,
    });
  };

  const handleRemove = () => {
    onTrackSelect(undefined);
  };

  return (
    <div>
      {selectedTrack ? (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
          {selectedTrack.albumArt ? (
            <img
              src={selectedTrack.albumArt}
              alt={selectedTrack.album}
              className="h-12 w-12 object-cover rounded-sm"
            />
          ) : (
            <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-sm">
              <Music className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedTrack.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {selectedTrack.artist} &middot; {selectedTrack.album}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRemove} className="h-8 w-8 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsSearchOpen(true)}
          className="w-full border-dashed"
        >
          <Music className="mr-2 h-4 w-4" />
          Add a song
        </Button>
      )}

      <TrackSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onTrackSelect={handleTrackSelect}
      />
    </div>
  );
};

export default MusicSection;
