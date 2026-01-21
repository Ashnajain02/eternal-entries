import React, { useState } from 'react';
import { SpotifyTrack } from '@/types';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import SpotifyTrackSearch from '@/components/spotify/SpotifyTrackSearch';
import SpotifyTrackDisplay from '@/components/spotify/SpotifyTrackDisplay';
import ClipRangeSelector from '@/components/spotify/ClipRangeSelector';

interface SpotifySectionProps {
  selectedTrack: SpotifyTrack | null | undefined;
  onTrackSelect: (track: SpotifyTrack | undefined) => void;
  spotifyConnected: boolean;
  onSpotifyConnect: () => void;
}

const SpotifySection: React.FC<SpotifySectionProps> = ({
  selectedTrack,
  onTrackSelect,
  spotifyConnected,
  onSpotifyConnect
}) => {
  const [isSpotifySearchOpen, setIsSpotifySearchOpen] = useState(false);

  const handleAddSong = () => {
    setIsSpotifySearchOpen(true);
  };

  const handleRemoveTrack = () => {
    onTrackSelect(undefined);
  };

  const handleTrackSelect = (track: SpotifyTrack) => {
    // Calculate default clip end based on actual track duration
    // Default to 30 seconds or full track if shorter
    const trackDurationSeconds = track.durationMs ? Math.floor(track.durationMs / 1000) : 30;
    const defaultClipEnd = Math.min(30, trackDurationSeconds);
    
    onTrackSelect({
      ...track,
      clipStartSeconds: 0,
      clipEndSeconds: defaultClipEnd
    });
  };

  const handleClipStartChange = (seconds: number) => {
    if (selectedTrack) {
      onTrackSelect({
        ...selectedTrack,
        clipStartSeconds: seconds
      });
    }
  };

  const handleClipEndChange = (seconds: number) => {
    if (selectedTrack) {
      onTrackSelect({
        ...selectedTrack,
        clipEndSeconds: seconds
      });
    }
  };

  // Calculate actual track duration in seconds
  const trackDurationSeconds = selectedTrack?.durationMs 
    ? Math.floor(selectedTrack.durationMs / 1000) 
    : 300; // Fallback to 5 min if no duration

  return (
    <div className="space-y-4">
      {selectedTrack ? (
        <>
          <SpotifyTrackDisplay 
            track={selectedTrack} 
            onRemove={handleRemoveTrack} 
          />
          <ClipRangeSelector
            trackUri={selectedTrack.uri}
            clipStartSeconds={selectedTrack.clipStartSeconds ?? 0}
            clipEndSeconds={selectedTrack.clipEndSeconds ?? 30}
            onStartChange={handleClipStartChange}
            onEndChange={handleClipEndChange}
            maxDuration={trackDurationSeconds}
          />
        </>
      ) : (
        <div>
          {spotifyConnected ? (
            <Button 
              variant="outline" 
              onClick={handleAddSong} 
              className="w-full border-dashed"
            >
              <Music className="mr-2 h-4 w-4" />
              Add song from Spotify
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={onSpotifyConnect} 
              className="w-full border-dashed"
            >
              <Music className="mr-2 h-4 w-4" />
              Connect to Spotify
            </Button>
          )}
        </div>
      )}
      
      <SpotifyTrackSearch 
        isOpen={isSpotifySearchOpen} 
        onClose={() => setIsSpotifySearchOpen(false)} 
        onTrackSelect={handleTrackSelect} 
      />
    </div>
  );
};

export default SpotifySection;
