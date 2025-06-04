
import React, { useState } from 'react';
import { SpotifyTrack } from '@/types';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import SpotifyTrackSearch from '@/components/spotify/SpotifyTrackSearch';
import SpotifyTrackDisplay from '@/components/spotify/SpotifyTrackDisplay';

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

  return (
    <div className="mb-6">
      {selectedTrack ? (
        <div className="mb-2">
          <SpotifyTrackDisplay 
            track={selectedTrack} 
            onRemove={handleRemoveTrack} 
          />
        </div>
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
        onTrackSelect={onTrackSelect} 
      />
    </div>
  );
};

export default SpotifySection;
