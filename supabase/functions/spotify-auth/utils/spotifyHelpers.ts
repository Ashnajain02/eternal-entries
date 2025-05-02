
// Format Spotify track search results
export function formatSpotifyTracks(items: any[]) {
  return items.map(track => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map(artist => artist.name).join(", "),
    album: track.album.name,
    albumArt: track.album.images[0]?.url || "",
    duration: track.duration_ms,
    spotifyUri: track.uri
  }));
}

// Ensure proper authorization header format
export function formatAuthHeader(token: string) {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}
