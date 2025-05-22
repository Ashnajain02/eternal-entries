
declare namespace Spotify {
  interface Error {
    message: string;
  }
  
  interface PlaybackState {
    context: {
      uri: string;
      metadata: any;
    };
    disallows: {
      pausing: boolean;
      peeking_next: boolean;
      peeking_prev: boolean;
      resuming: boolean;
      seeking: boolean;
      skipping_next: boolean;
      skipping_prev: boolean;
    };
    duration: number;
    paused: boolean;
    position: number;
    repeat_mode: number;
    shuffle: boolean;
    track_window: {
      current_track: WebPlaybackTrack;
      previous_tracks: WebPlaybackTrack[];
      next_tracks: WebPlaybackTrack[];
    };
  }

  interface WebPlaybackTrack {
    id: string;
    uri: string;
    type: string;
    media_type: string;
    name: string;
    is_playable: boolean;
    duration_ms: number;
    album: {
      uri: string;
      name: string;
      images: { url: string }[];
    };
    artists: { uri: string; name: string }[];
  }

  interface Player {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(
      event: string,
      callback: (state: Spotify.PlaybackState) => void
    ): boolean;
    removeListener(event: string): boolean;
    getCurrentState(): Promise<Spotify.PlaybackState | null>;
    setName(name: string): Promise<void>;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(position_ms: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
  }
}

interface Window {
  onSpotifyWebPlaybackSDKReady: () => void;
  Spotify: {
    Player: new (options: {
      name: string;
      getOAuthToken: (callback: (token: string) => void) => void;
      volume?: number;
    }) => Spotify.Player;
  };
}
