
import React, { useState, useRef } from 'react';
import { SpotifyTrack } from '@/types';
import { searchSpotifyTracks } from '@/services/spotify';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpotifySearchProps {
  onSelectTrack: (track: SpotifyTrack | null) => void;
  selectedTrack: SpotifyTrack | null;
}

const SpotifySearch: React.FC<SpotifySearchProps> = ({ onSelectTrack, selectedTrack }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  const handleSearch = (value: string) => {
    setQuery(value);
    
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Don't search if query is too short
    if (!value || value.length < 2) {
      setSearchResults([]);
      return;
    }
    
    // Debounce search
    searchTimeout.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const tracks = await searchSpotifyTracks(value);
        setSearchResults(tracks);
      } catch (error) {
        console.error('Error searching tracks:', error);
        toast({
          title: "Spotify Search Failed",
          description: error.message || "Could not search for tracks",
          variant: "destructive"
        });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };
  
  const handleSelectTrack = (track: SpotifyTrack) => {
    onSelectTrack(track);
    setIsOpen(false);
  };
  
  const handleRemoveTrack = () => {
    onSelectTrack(null);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          Link a song to this entry
        </label>
        
        <div className="flex gap-2 items-center">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isOpen}
                className="flex-1 justify-between"
              >
                {selectedTrack ? (
                  <div className="flex items-center gap-2 truncate">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{selectedTrack.name} by {selectedTrack.artist}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Search className="h-4 w-4" />
                    <span>Search for a song...</span>
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" style={{ width: "calc(100vw - 2rem)", maxWidth: "500px" }}>
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Search songs..." 
                  value={query}
                  onValueChange={handleSearch}
                  className="h-9"
                />
                <CommandList>
                  <CommandEmpty>
                    {isSearching ? 'Searching...' : query ? 'No results found.' : 'Type to search...'}
                  </CommandEmpty>
                  <CommandGroup>
                    {searchResults.map((track) => (
                      <CommandItem
                        key={track.id}
                        value={track.id}
                        onSelect={() => handleSelectTrack(track)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          {track.albumArt && (
                            <img 
                              src={track.albumArt} 
                              alt={track.album}
                              className="h-10 w-10 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 overflow-hidden">
                            <p className="font-medium truncate">{track.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          {selectedTrack && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRemoveTrack}
              title="Remove song"
            >
              ✕
            </Button>
          )}
        </div>
      </div>
      
      {selectedTrack && (
        <div className="flex items-center gap-3 p-3 border rounded bg-muted/50">
          {selectedTrack.albumArt && (
            <img 
              src={selectedTrack.albumArt} 
              alt={selectedTrack.album}
              className="h-12 w-12 object-cover rounded"
            />
          )}
          <div>
            <p className="font-medium">{selectedTrack.name}</p>
            <p className="text-sm text-muted-foreground">{selectedTrack.artist} • {selectedTrack.album}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifySearch;
