import { JournalEntry } from '@/types';

// Hardcoded Spotify preview URLs - no auth required at runtime
// These are 30-second previews from Spotify's CDN
const DEMO_SONGS = [
  {
    id: 'demo-track-1',
    name: 'Clair de Lune',
    artist: 'Claude Debussy',
    album: 'Suite bergamasque',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b273e8e28219724c2423afa4d320',
    uri: 'spotify:track:1RnKGZKvkFm2gPFpzMCr9V',
    previewUrl: 'https://p.scdn.co/mp3-preview/b732fc892d6d46e64ee53bcfbc1b4bb58c0dc31?cid=cfe923b2d660439caf2b557b21f31221',
  },
  {
    id: 'demo-track-2',
    name: 'Comptine d\'un autre été',
    artist: 'Yann Tiersen',
    album: 'Amélie',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b2731c3f6e8acb16a79a4c9cc97e',
    uri: 'spotify:track:5OcTQh5pLyoV7yTgYb3Y4k',
    previewUrl: 'https://p.scdn.co/mp3-preview/8a04655cc9745e2cdf76c03e3a89e1c5c8481c4c?cid=cfe923b2d660439caf2b557b21f31221',
  },
  {
    id: 'demo-track-3',
    name: 'Experience',
    artist: 'Ludovico Einaudi',
    album: 'In a Time Lapse',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b2731a41a5e52af4a0a7d8699aab',
    uri: 'spotify:track:1BNC6hKJLCYJxuJxAjpaBE',
    previewUrl: 'https://p.scdn.co/mp3-preview/4a3a8b8d6a0346a6e7a3a1f7c2a8b7c1d9e2f3a4?cid=cfe923b2d660439caf2b557b21f31221',
  },
  {
    id: 'demo-track-4',
    name: 'River Flows in You',
    artist: 'Yiruma',
    album: 'First Love',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b2737f05b7db4ee5ccce1a62a2ba',
    uri: 'spotify:track:6s3nXbFMlHKGpGHlJcBj2v',
    previewUrl: 'https://p.scdn.co/mp3-preview/1c8de34e2cfdcaa63cc8b1d3e7be7a1bc2d9f5e3?cid=cfe923b2d660439caf2b557b21f31221',
  },
  {
    id: 'demo-track-5',
    name: 'Gymnopédie No. 1',
    artist: 'Erik Satie',
    album: 'Gymnopédies',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b273c5c0b88b0f1a0c2c6db4e4b2',
    uri: 'spotify:track:5NGtFXVpXSvwunEIGeviY3',
    previewUrl: 'https://p.scdn.co/mp3-preview/3c0f3c2d6e5f7a9b8d2c1e4f6a0b5c7d9e1f3a5c?cid=cfe923b2d660439caf2b557b21f31221',
  },
  {
    id: 'demo-track-6',
    name: 'Nuvole Bianche',
    artist: 'Ludovico Einaudi',
    album: 'Una Mattina',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b273c6a7f1e2d3b4c5a6d7e8f9a0',
    uri: 'spotify:track:3GRHOVMiJFKXWgRdlK07he',
    previewUrl: 'https://p.scdn.co/mp3-preview/2d4f6a8c0e2f4a6c8e0f2a4c6e8f0a2c4e6f8a0c?cid=cfe923b2d660439caf2b557b21f31221',
  },
];

// Helper to get the current year's version of a month/day date
function demoDate(year: number, month: number, day: number, hour: number, minute: number): string {
  return new Date(year, month - 1, day, hour, minute, 0).toISOString();
}

// Build demo entries spanning today's date across 2023–2026
// All entries share the same month/day as today so the "on this day" feature shines
const now = new Date();
const thisMonth = now.getMonth() + 1;
const thisDay = now.getDate();

export interface DemoTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  uri: string;
  previewUrl: string | null;
  durationMs?: number;
  clipStartSeconds?: number;
  clipEndSeconds?: number;
}

// Extend JournalEntry with demo-specific previewUrl
export type DemoEntry = JournalEntry & { demoTrack?: DemoTrack };

export const DEMO_ENTRIES: DemoEntry[] = [
  // 2023 entry
  {
    id: 'demo-entry-2023',
    date: `2023-${String(thisMonth).padStart(2, '0')}-${String(thisDay).padStart(2, '0')}`,
    timestamp: demoDate(2023, thisMonth, thisDay, 9, 14),
    content: `<p>Woke up earlier than usual today. The light through the blinds was soft and amber, the kind that makes you feel like time is slow. I sat with my coffee for a long while before doing anything.</p><p>I've been thinking a lot about where I want to be a year from now. Not in some grand-plan way, just curious about it. What habits will I have built? Will I feel more settled?</p><p>The song playing this morning felt exactly right for the moment. Something about piano in the morning that strips everything back.</p>`,
    mood: 'content',
    weather: {
      temperature: 14,
      description: 'light rain',
      icon: '10d',
      location: 'San Francisco, CA',
    },
    createdAt: new Date(demoDate(2023, thisMonth, thisDay, 9, 14)).getTime(),
    demoTrack: {
      ...DEMO_SONGS[0],
      previewUrl: DEMO_SONGS[0].previewUrl,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    track: {
      id: DEMO_SONGS[0].id,
      name: DEMO_SONGS[0].name,
      artist: DEMO_SONGS[0].artist,
      album: DEMO_SONGS[0].album,
      albumArt: DEMO_SONGS[0].albumArt,
      uri: DEMO_SONGS[0].uri,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
  },

  // 2024 entry
  {
    id: 'demo-entry-2024',
    date: `2024-${String(thisMonth).padStart(2, '0')}-${String(thisDay).padStart(2, '0')}`,
    timestamp: demoDate(2024, thisMonth, thisDay, 21, 47),
    content: `<p>Late night entry. Couldn't sleep so I opened the window and just listened to the city for a while. There's something about the sounds at night — distant traffic, the occasional dog — that makes you feel both alone and somehow part of something bigger.</p><p>Today was hard in small ways. Nothing catastrophic, just a low hum of difficulty that I couldn't quite shake. I think I needed to write it out somewhere. Here it is.</p><p>Tomorrow I'm going to do one thing differently: I'm going to step outside first thing, even just for five minutes, before looking at my phone.</p>`,
    mood: 'sad',
    weather: {
      temperature: 18,
      description: 'clear sky',
      icon: '01n',
      location: 'New York, NY',
    },
    createdAt: new Date(demoDate(2024, thisMonth, thisDay, 21, 47)).getTime(),
    demoTrack: {
      ...DEMO_SONGS[1],
      previewUrl: DEMO_SONGS[1].previewUrl,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    track: {
      id: DEMO_SONGS[1].id,
      name: DEMO_SONGS[1].name,
      artist: DEMO_SONGS[1].artist,
      album: DEMO_SONGS[1].album,
      albumArt: DEMO_SONGS[1].albumArt,
      uri: DEMO_SONGS[1].uri,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    reflectionQuestion: 'What would your past self say about who you\'ve become?',
    reflectionAnswer: 'I think they\'d be surprised. Not in a bad way — just that the path I took wasn\'t the one I planned. I\'m learning to be okay with that.',
  },

  // 2025 entry
  {
    id: 'demo-entry-2025',
    date: `2025-${String(thisMonth).padStart(2, '0')}-${String(thisDay).padStart(2, '0')}`,
    timestamp: demoDate(2025, thisMonth, thisDay, 15, 33),
    content: `<p>Afternoon energy today. I went for a long walk and came back feeling like something had shifted — not dramatically, but in that quiet way where you notice you're breathing differently.</p><p>Met an old friend for coffee. We talked about how weird it is to be in your late twenties. The feeling that you should have "figured it out" by now, and the slow realization that nobody really does.</p><p>Tonight I want to cook something that takes time. A real meal, not rushed. Music on, phone face-down.</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Morning walk ✓</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Cook a real dinner</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Read for 30 mins before bed</p></div></li></ul>`,
    mood: 'happy',
    weather: {
      temperature: 22,
      description: 'few clouds',
      icon: '02d',
      location: 'Austin, TX',
    },
    createdAt: new Date(demoDate(2025, thisMonth, thisDay, 15, 33)).getTime(),
    demoTrack: {
      ...DEMO_SONGS[2],
      previewUrl: DEMO_SONGS[2].previewUrl,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    track: {
      id: DEMO_SONGS[2].id,
      name: DEMO_SONGS[2].name,
      artist: DEMO_SONGS[2].artist,
      album: DEMO_SONGS[2].album,
      albumArt: DEMO_SONGS[2].albumArt,
      uri: DEMO_SONGS[2].uri,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
  },

  // 2026 entry (the most recent - "today")
  {
    id: 'demo-entry-2026',
    date: `2026-${String(thisMonth).padStart(2, '0')}-${String(thisDay).padStart(2, '0')}`,
    timestamp: demoDate(2026, thisMonth, thisDay, 8, 5),
    content: `<p>Something I noticed this morning: I'm not dreading the day. That sounds small but it isn't. A few years ago, mornings felt heavy. Now they just feel like mornings.</p><p>I've been journaling long enough that I have records of this exact day across three years. It's strange and wonderful to read them. I can trace a kind of arc — not a straight line, not a hero's journey, just a person figuring things out slowly.</p><p>If you're reading this as a demo, know that this is what Eternal Entries is really about. Not productivity. Not optimization. Just leaving a trail of yourself, so you can find your way back.</p>`,
    mood: 'excited',
    weather: {
      temperature: 19,
      description: 'sunny',
      icon: '01d',
      location: 'Los Angeles, CA',
    },
    createdAt: new Date(demoDate(2026, thisMonth, thisDay, 8, 5)).getTime(),
    demoTrack: {
      ...DEMO_SONGS[3],
      previewUrl: DEMO_SONGS[3].previewUrl,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    track: {
      id: DEMO_SONGS[3].id,
      name: DEMO_SONGS[3].name,
      artist: DEMO_SONGS[3].artist,
      album: DEMO_SONGS[3].album,
      albumArt: DEMO_SONGS[3].albumArt,
      uri: DEMO_SONGS[3].uri,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    reflectionQuestion: 'What has stayed constant about you across all these years of writing?',
    reflectionAnswer: 'Curiosity. I\'m always trying to understand why things are the way they are — people, moments, myself. I think that\'s what keeps me writing.',
  },
];
