import React, { useEffect } from 'react';
import { SpotifyTrack } from '@/types';
import { Button } from '@/components/ui/button';
import { Play, Pause, AlertCircle } from 'lucide-react';
import { useSpotifyPlayback } from '@/contexts/SpotifyPlaybackContext';
import ClipRangeSlider from './ClipRangeSlider';

interface SpotifyClipPlayerProps {
  track: SpotifyTrack;
  entryId: string;
  onReconnectClick?: () => void;
}

const SpotifyClipPlayer: React.FC<SpotifyClipPlayerProps> = ({
  track,
  entryId,
  onReconnectClick
}) => {
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

  useEffect(() => {
    if (!isReady && !needsReauth) {
      initializePlayer();
    }
  }, [isReady, needsReauth, initializePlayer]);

  useEffect(() => {
    return () => {
      if (currentClip?.entryId === entryId) {
        pauseClip();
      }
    };
  }, [entryId, currentClip, pauseClip]);

  const handleTogglePlay = async () => {
    if (!track.uri) return;
    const clipInfo = {
      entryId,
      trackUri: track.uri,
      clipStartSeconds: track.clipStartSeconds ?? 0,
      clipEndSeconds: track.clipEndSeconds ?? 30
    };
    if (isPlaying && currentClip?.entryId === entryId) {
      await pauseClip();
    } else {
      await playClip(clipInfo);
    }
  };

  const isThisClipPlaying = isPlaying && currentClip?.entryId === entryId;
  const clipStart = track.clipStartSeconds ?? 0;
  const clipEnd = track.clipEndSeconds ?? 30;

  if (needsReauth) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <img src={track.imageUrl || '/placeholder.svg'} alt={track.name} className="w-12 h-12 rounded object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        </div>
        {onReconnectClick && (
          <Button variant="outline" size="sm" onClick={onReconnectClick} className="shrink-0">
            <AlertCircle className="h-4 w-4 mr-1" />Reconnect
          </Button>
        )}
      </div>
    );
  }

  if (isPremium === false) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <img src={track.imageUrl || '/placeholder.svg'} alt={track.name} className="w-12 h-12 rounded object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
          <p className="text-xs text-muted-foreground mt-1">Premium required for playback</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <img src={track.imageUrl || '/placeholder.svg'} alt={track.name} className="w-12 h-12 rounded object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleTogglePlay} disabled={!isReady && isPremium !== null}
          className="shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          {isThisClipPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>
      </div>
      <ClipRangeSlider trackDuration={180} clipStart={clipStart} clipEnd={clipEnd}
        currentPosition={isThisClipPlaying ? position : clipStart} isPlaying={isThisClipPlaying}
        onRangeChange={() => {}} className="pointer-events-none opacity-80" />
    </div>
  );
};

export default SpotifyClipPlayer;