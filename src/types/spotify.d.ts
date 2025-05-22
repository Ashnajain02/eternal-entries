
declare namespace Spotify {
  interface Player {
    addListener(event: string, callback: Function): void;
    connect(): Promise<boolean>;
    disconnect(): void;
    getCurrentState(): Promise<Spotify.PlaybackState | null>;
    getVolume(): Promise<number>;
    nextTrack(): Promise<void>;
    pause(): Promise<void>;
    previousTrack(): Promise<void>;
    resume(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    setName(name: string): Promise<void>;
    setVolume(volume: number): Promise<void>;
    togglePlay(): Promise<void>;
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
      next_tracks: WebPlaybackTrack[];
      previous_tracks: WebPlaybackTrack[];
    };
  }

  interface WebPlaybackTrack {
    id: string;
    uri: string;
    type: string;
    linked_from_uri: string | null;
    linked_from: {
      uri: string | null;
      id: string | null;
    };
    media_type: string;
    name: string;
    duration_ms: number;
    artists: Array<{ name: string; uri: string; id: string }>;
    album: {
      uri: string;
      name: string;
      id: string;
      images: Array<{ url: string }>;
    };
    is_playable: boolean;
  }

  interface WebPlaybackError {
    message: string;
  }
}

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
      }) => Spotify.Player;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}
