
import React, { useState } from 'react';
import { SpotifyTrack } from '@/types';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';

interface SpotifyPlayerProps {
  track: SpotifyTrack;
}

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ track }) => {
  const [showPlayer, setShowPlayer] = useState(false);
  
  // Extract the Spotify ID from the URI (format: "spotify:track:1234567890")
  const trackId = track.uri.split(':').pop();
  
  if (!trackId) {
    return null;
  }
  
  if (!showPlayer) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded bg-muted/50">
        {track.albumArt && (
          <img 
            src={track.albumArt} 
            alt={track.album}
            className="h-12 w-12 object-cover rounded"
          />
        )}
        <div className="flex-1">
          <p className="font-medium">{track.name}</p>
          <p className="text-sm text-muted-foreground">{track.artist} • {track.album}</p>
        </div>
        <Button onClick={() => setShowPlayer(true)} variant="outline" size="sm" className="flex items-center gap-1">
          <Music className="h-4 w-4" /> Play
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <iframe
        title="Spotify Track Player"
        src={`https://open.spotify.com/embed/track/${trackId}`}
        width="100%"
        height="80"
        frameBorder="0"
        allowTransparency={true}
        allow="encrypted-media"
        className="rounded border"
      />
      <div className="flex justify-end">
        <Button 
          onClick={() => setShowPlayer(false)} 
          variant="ghost" 
          size="sm"
          className="text-xs"
        >
          Hide Player
        </Button>
      </div>
    </div>
  );
};

export default SpotifyPlayer;
