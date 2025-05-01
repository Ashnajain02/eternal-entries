
import React, { useState, useEffect } from 'react';
import { SpotifyTrack } from '@/types';
import { searchSpotifyTracks, getSpotifyConnectionStatus } from '@/services/spotify';
import { Music, Search, AlertCircle, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import { toast } from "@/hooks/use-toast";

interface SpotifySearchProps {
  onSelect: (track: SpotifyTrack) => void;
  selectedTrack: SpotifyTrack | undefined;
}

const SpotifySearch: React.FC<SpotifySearchProps> = ({ onSelect, selectedTrack }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [spotifyUsername, setSpotifyUsername] = useState<string | null>(null);
  const [connectionChecked, setConnectionChecked] = useState(false);

  // Check Spotify connection status
  useEffect(() => {
    const checkSpotifyConnection = async () => {
      try {
        const status = await getSpotifyConnectionStatus();
        setSpotifyConnected(status.connected && !status.expired);
        setSpotifyUsername(status.username);
      } catch (error) {
        console.error('Error checking Spotify connection:', error);
        setSpotifyConnected(false);
      } finally {
        setConnectionChecked(true);
      }
    };

    if (isOpen && !connectionChecked) {
      checkSpotifyConnection();
    }
  }, [isOpen, connectionChecked]);

  // Search for tracks when query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim() || !spotifyConnected) {
        setResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const tracks = await searchSpotifyTracks(query);
        setResults(tracks);
      } catch (error) {
        console.error('Error searching tracks:', error);
        
        // Show toast for specific errors
        if (error.message.includes("reconnect")) {
          toast({
            title: "Spotify session expired",
            description: "Please reconnect to Spotify in Settings.",
            variant: "destructive"
          });
          setSpotifyConnected(false);
        }
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(() => {
      if (spotifyConnected) {
        fetchResults();
      }
    }, 300);
    
    return () => clearTimeout(debounce);
  }, [query, spotifyConnected]);

  const handleSelect = (track: SpotifyTrack) => {
    onSelect(track);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {selectedTrack ? (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 w-full border-dashed p-2 h-auto"
            >
              <img 
                src={selectedTrack.albumArt} 
                alt={`${selectedTrack.album} cover`} 
                className="h-12 w-12 rounded"
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">{selectedTrack.name}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedTrack.artist}</p>
              </div>
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 w-full text-muted-foreground"
            >
              <Music className="h-4 w-4" />
              <span>Add a song you're listening to</span>
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" align="start">
          {connectionChecked && !spotifyConnected ? (
            <div className="p-4 text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm">
                Connect your Spotify account to search for and add songs.
              </p>
              <Link to="/settings">
                <Button className="w-full flex items-center gap-2">
                  <span>Connect to Spotify</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {spotifyUsername && (
                <div className="text-xs text-muted-foreground text-center pb-1">
                  Connected as {spotifyUsername}
                </div>
              )}
              
              <div className="flex items-center border rounded-md pl-3 focus-within:ring-1 focus-within:ring-ring">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="Search songs..."
                  className="border-none focus-visible:ring-0 shadow-none"
                  autoComplete="off"
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-1">
                {isSearching ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 animate-pulse">
                      <div className="h-10 w-10 rounded bg-muted"></div>
                      <div className="space-y-1 flex-1">
                        <div className="h-4 w-3/4 rounded bg-muted"></div>
                        <div className="h-3 w-1/2 rounded bg-muted"></div>
                      </div>
                    </div>
                  ))
                ) : results.length > 0 ? (
                  results.map((track) => (
                    <button
                      key={track.id}
                      className="flex items-center gap-2 p-2 w-full hover:bg-muted rounded-md transition-colors"
                      onClick={() => handleSelect(track)}
                    >
                      <img 
                        src={track.albumArt} 
                        alt={`${track.album} cover`} 
                        className="h-10 w-10 rounded"
                      />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{track.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                      </div>
                    </button>
                  ))
                ) : query ? (
                  <p className="text-sm text-center py-2 text-muted-foreground">
                    No songs found
                  </p>
                ) : (
                  <p className="text-sm text-center py-2 text-muted-foreground">
                    Start typing to search songs
                  </p>
                )}
              </div>
              
              <div className="pt-2 flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Results from Spotify
                </p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SpotifySearch;
