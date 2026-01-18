import React, { useState, useCallback, useEffect } from 'react';
import { SpotifyTrack } from '@/types';
import { Button } from '@/components/ui/button';
import { Music, Play, Pause, AlertCircle } from 'lucide-react';
import SpotifyTrackSearch from '@/components/spotify/SpotifyTrackSearch';
import SpotifyTrackDisplay from '@/components/spotify/SpotifyTrackDisplay';
import ClipRangeSlider from '@/components/spotify/ClipRangeSlider';
import { useSpotifyPlayback } from '@/contexts/SpotifyPlaybackContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SpotifySectionProps {
  selectedTrack: SpotifyTrack | null | undefined;
  onTrackSelect: (track: SpotifyTrack | undefined) => void;
  spotifyConnected: boolean;
  onSpotifyConnect: () => void;
  entryId?: string; // For playback identification
}

const SpotifySection: React.FC<SpotifySectionProps> = ({
  selectedTrack,
  onTrackSelect,
  spotifyConnected,
  onSpotifyConnect,
  entryId = 'editor-preview'
}) => {
  const [isSpotifySearchOpen, setIsSpotifySearchOpen] = useState(false);
  
  const { 
    isReady, 
    isPremium, 
    isPlaying, 
    currentClip, 
    position,
    needsReauth,
    initializePlayer,
    playClip,
    pauseClip
  } = useSpotifyPlayback();

  // Initialize player when track is selected
  useEffect(() => {
    if (selectedTrack && !isReady && !needsReauth) {
      initializePlayer();
    }
  }, [selectedTrack, isReady, needsReauth, initializePlayer]);

  // Stop playback when component unmounts or track changes
  useEffect(() => {
    return () => {
      if (currentClip?.entryId === entryId) {
        pauseClip();
      }
    };
  }, [entryId, currentClip, pauseClip]);

  const handleAddSong = () => {
    setIsSpotifySearchOpen(true);
  };

  const handleRemoveTrack = () => {
    if (currentClip?.entryId === entryId) {
      pauseClip();
    }
    onTrackSelect(undefined);
  };

  const handleTrackSelect = (track: SpotifyTrack) => {
    // Set default clip timestamps when selecting a new track (30 second clip from start)
    onTrackSelect({
      ...track,
      clipStartSeconds: 0,
      clipEndSeconds: 30
    });
  };

  const handleRangeChange = useCallback((start: number, end: number) => {
    if (selectedTrack) {
      onTrackSelect({
        ...selectedTrack,
        clipStartSeconds: start,
        clipEndSeconds: end
      });
    }
  }, [selectedTrack, onTrackSelect]);

  const handlePlayPreview = useCallback(async () => {
    if (!selectedTrack?.uri) return;

    const clipInfo = {
      entryId,
      trackUri: selectedTrack.uri,
      clipStartSeconds: selectedTrack.clipStartSeconds ?? 0,
      clipEndSeconds: selectedTrack.clipEndSeconds ?? 30
    };

    if (isPlaying && currentClip?.entryId === entryId) {
      await pauseClip();
    } else {
      await playClip(clipInfo);
    }
  }, [selectedTrack, entryId, isPlaying, currentClip, playClip, pauseClip]);

  const isThisClipPlaying = isPlaying && currentClip?.entryId === entryId;

  // Default track duration (3 minutes if not known)
  const trackDuration = 180;

  return (
    <div className="space-y-4">
      {selectedTrack ? (
        <>
          <SpotifyTrackDisplay 
            track={selectedTrack} 
            onRemove={handleRemoveTrack} 
          />
          
          {/* Premium check / Reauth warning */}
          {needsReauth && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <button 
                  onClick={onSpotifyConnect}
                  className="underline hover:no-underline"
                >
                  Reconnect Spotify
                </button>
                {' '}to enable clip playback
              </AlertDescription>
            </Alert>
          )}

          {isPremium === false && !needsReauth && (
            <Alert className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                Spotify Premium required for clip playback. Track info will still be saved.
              </AlertDescription>
            </Alert>
          )}

          {/* Clip Range Slider */}
          <div className="space-y-3">
            <ClipRangeSlider
              trackDuration={trackDuration}
              clipStart={selectedTrack.clipStartSeconds ?? 0}
              clipEnd={selectedTrack.clipEndSeconds ?? 30}
              currentPosition={isThisClipPlaying ? position : (selectedTrack.clipStartSeconds ?? 0)}
              isPlaying={isThisClipPlaying}
              onRangeChange={handleRangeChange}
            />

            {/* Play Preview Button */}
            {(isPremium !== false || isPremium === null) && !needsReauth && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPreview}
                disabled={!isReady && isPremium !== null}
                className="w-full"
              >
                {isThisClipPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Preview
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Preview Clip
                  </>
                )}
              </Button>
            )}
          </div>
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