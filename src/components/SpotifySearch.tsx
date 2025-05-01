
import React, { useState, useEffect } from 'react';
import { SpotifyTrack } from '@/types';
import { searchSpotifyTrack } from '@/services/api';
import { Music, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SpotifySearchProps {
  onSelect: (track: SpotifyTrack) => void;
  selectedTrack: SpotifyTrack | undefined;
}

const SpotifySearch: React.FC<SpotifySearchProps> = ({ onSelect, selectedTrack }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const tracks = await searchSpotifyTrack(query);
        setResults(tracks);
      } catch (error) {
        console.error('Error searching tracks:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [query]);

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
          <div className="space-y-2">
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
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SpotifySearch;
