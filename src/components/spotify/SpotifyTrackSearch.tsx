
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Music, Loader2 } from 'lucide-react';
import { SpotifyTrack } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SpotifyTrackSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackSelect: (track: SpotifyTrack) => void;
}

const SpotifyTrackSearch: React.FC<SpotifyTrackSearchProps> = ({
  isOpen,
  onClose,
  onTrackSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setDebugInfo('');
    
    try {
      console.log("Starting Spotify search for:", searchQuery);
      
      // Get session to ensure we have a valid token
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("No active session found");
      }
      
      console.log("Calling spotify-search edge function");
      const { data, error } = await supabase.functions.invoke('spotify-search', {
        body: { query: searchQuery, type: 'track', limit: 10 }
      });
      
      if (error) throw new Error(error.message);
      console.log("Search response received:", data);
      
      if (data && data.tracks) {
        setSearchResults(data.tracks);
      } else {
        setDebugInfo(`Unexpected response format: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      console.error('Error searching Spotify:', error);
      
      // Detailed error info for debugging
      let errorMessage = error.message || "Failed to search Spotify";
      setDebugInfo(`Error details: ${JSON.stringify(error, null, 2)}`);
      
      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrackSelect = (track: SpotifyTrack) => {
    onTrackSelect(track);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Search Spotify</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSearch} className="flex items-center gap-2 my-4">
          <Input
            type="text"
            placeholder="Search for songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="sr-only">Search</span>
          </Button>
        </form>
        
        {debugInfo && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs font-mono overflow-auto max-h-24">{debugInfo}</p>
          </div>
        )}
        
        {isSearching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {searchResults.map((track) => (
              <div key={track.id} className="flex items-center gap-3 p-2 hover:bg-accent rounded-md">
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
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                </div>
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTrackSelect(track)}
                >
                  Select
                </Button>
              </div>
            ))}
          </div>
        ) : searchQuery && !isSearching ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No tracks found</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default SpotifyTrackSearch;
