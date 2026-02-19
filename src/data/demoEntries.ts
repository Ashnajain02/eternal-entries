import { JournalEntry } from '@/types';

// NOTE: Spotify deprecated preview_url in Nov 2024. These URLs may or may not work —
// the player shows "Preview unavailable" gracefully if they 404.
// Tracks chosen from user's curated list, matched to entry mood.
const DEMO_SONGS = [
  {
    // Calm/Nostalgic — matched to "content" 2023 entry
    id: '4pFOZXL4gfTBEwLUmOarqN',
    name: 'Holocene',
    artist: 'Bon Iver',
    album: 'Bon Iver, Bon Iver',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b273e8ee9509f10afeafc5e2b9ba',
    uri: 'spotify:track:4pFOZXL4gfTBEwLUmOarqN',
    previewUrl: 'https://p.scdn.co/mp3-preview/8e96fad0b4a825e567de6b9b4e2527e90e818965?cid=cfe923b2d660439caf2b557b21f31221',
  },
  {
    // Calm/Nostalgic — matched to "sad" 2024 night entry
    id: '3hRV0jL3vUpRrcy398teAU',
    name: 'The Night We Met',
    artist: 'Lord Huron',
    album: 'Strange Trails',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b27317875a0610c23d8946454583',
    uri: 'spotify:track:3hRV0jL3vUpRrcy398teAU',
    previewUrl: 'https://p.scdn.co/mp3-preview/84748fccd2c12d7a31ad4693ee2d3d7eec8be74b?cid=cfe923b2d660439caf2b557b21f31221',
  },
  {
    // Calm/Nostalgic — matched to "happy" 2025 afternoon entry
    id: '7v4DcYJDSpA6L3KXHVJ8N7',
    name: 'Rivers and Roads',
    artist: 'The Head and the Heart',
    album: 'The Head and the Heart',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b273f3b2f40a6e6e8e2a8d9f8b3c',
    uri: 'spotify:track:7v4DcYJDSpA6L3KXHVJ8N7',
    previewUrl: 'https://p.scdn.co/mp3-preview/b6c0ca0da9d32948a29f0ccf1d0a07d40c57b56e?cid=cfe923b2d660439caf2b557b21f31221',
  },
  {
    // Growth/Empowering — matched to "excited" 2026 morning entry
    id: '6QhjECKvUJiGiZMDWIMRKP',
    name: 'Dog Days Are Over',
    artist: 'Florence + The Machine',
    album: 'Lungs',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b273e89dbd8ec052834e3e1d6748',
    uri: 'spotify:track:6QhjECKvUJiGiZMDWIMRKP',
    previewUrl: 'https://p.scdn.co/mp3-preview/0a18cf01a7f1cf0d0e2f85bf73ca05e0fd6c9b15?cid=cfe923b2d660439caf2b557b21f31221',
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
    content: `<p>Woke up earlier than usual today. The light through the blinds was soft and amber — the kind that makes you feel like time is moving slowly, on purpose. Holocene came on shuffle and I just let it play through, twice.</p><p>I've been thinking about where I want to be a year from now. Not in some grand-plan way, just curious. What habits will I have built? Will I feel more settled?</p><p>There's something about Bon Iver in the morning that strips everything back. Like being a child again, but with more to lose. In a good way.</p>`,
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
    content: `<p>Late night entry. Couldn't sleep so I opened the window and listened to the city. Somewhere around midnight I put on The Night We Met and just sat with it. It hit differently tonight.</p><p>Today was hard in small ways. Nothing catastrophic, just a low hum of difficulty I couldn't shake. I needed to write it somewhere. Here it is.</p><p>Tomorrow I'm going to do one thing differently: step outside first thing, even just for five minutes, before looking at my phone.</p>`,
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
    content: `<p>Afternoon energy today. Went for a long walk with Rivers and Roads in my ears and came back feeling like something had shifted — not dramatically, but in that quiet way where you notice you're breathing differently.</p><p>Met an old friend for coffee. We talked about how strange it is to grow up — that feeling you should have "figured it out" by now, and the slow realization that nobody really does.</p><p>Tonight I want to cook something that takes time. Music on, phone face-down.</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Morning walk ✓</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Cook a real dinner</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Read for 30 mins before bed</p></div></li></ul>`,
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
    content: `<p>Something I noticed this morning: I'm not dreading the day. That sounds small, but it isn't. A few years ago mornings felt like an obstacle. Now they just feel like mornings. Dog Days Are Over came on and I actually laughed — it felt earned.</p><p>I've been journaling long enough to have records of this exact day across three years. It's strange and wonderful to read them. I can trace an arc — not a straight line, not a hero's journey, just a person figuring things out slowly.</p><p>If you're reading this as a demo: this is what Eternal Entries is really about. Not productivity. Not optimization. Just leaving a trail of yourself, so you can find your way back.</p>`,
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
