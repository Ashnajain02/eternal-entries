import { JournalEntry } from '@/types';

// Tracks chosen from user's curated list, matched to entry mood.
// All tracks use Apple Music data (iTunes CDN for art and audio previews).
const DEMO_SONGS = [
  {
    // Calm/Nostalgic — matched to "content" 2023 entry
    id: '1604657975',
    name: 'ceilings',
    artist: 'Lizzy McAlpine',
    album: 'five seconds flat',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/11/6a/64/116a64ee-0db3-4e59-bd86-f44008e47f85/5056167170006.jpg/300x300bb.jpg',
    uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7b/52/b7/7b52b754-157a-6946-1a7f-3885d0d4b45f/mzaf_11031506980503485356.plus.aac.p.m4a',
    durationMs: 182888,
  },
  {
    // Emotional — matched to "sad" 2024 night entry
    id: '1739659142',
    name: 'BIRDS OF A FEATHER',
    artist: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/300x300bb.jpg',
    uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/34/31/d3/3431d34e-847f-5d66-df83-0bce688d997e/mzaf_18106743962423782018.plus.aac.p.m4a',
    durationMs: 210373,
  },
  {
    // Warm/Gentle — matched to "happy" 2025 afternoon entry
    id: '900672692',
    name: 'Like Real People Do',
    artist: 'Hozier',
    album: 'Hozier (Expanded Edition)',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/5e/1b/f1/5e1bf1de-e5f1-e73e-0752-e7882b4f2d57/886444718820.jpg/300x300bb.jpg',
    uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/fc/ac/c7/fcacc74c-0af0-96c2-5242-413edf274c8c/mzaf_13137692970460201319.plus.aac.p.m4a',
    durationMs: 198029,
  },
  {
    // Reflective/Gentle — matched to "excited" 2026 morning entry
    id: '1122782281',
    name: 'Sparks',
    artist: 'Coldplay',
    album: 'Parachutes',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f5/93/8c/f5938c49-964c-31d1-4b33-78b634f71fb7/190295978075.jpg/300x300bb.jpg',
    uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/47/db/ce/47dbce82-d89c-0897-0da7-26d06ae7e2f2/mzaf_14852507599380441353.plus.aac.p.m4a',
    durationMs: 227094,
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
  durationMs?: number;
  clipStartSeconds?: number;
  clipEndSeconds?: number;
}

// Extend JournalEntry with demo-specific track data
export type DemoEntry = JournalEntry & { demoTrack?: DemoTrack };

export const DEMO_ENTRIES: DemoEntry[] = [
  // 2023 entry
  {
    id: 'demo-entry-2023',
    date: `2023-${String(thisMonth).padStart(2, '0')}-${String(thisDay).padStart(2, '0')}`,
    timestamp: demoDate(2023, thisMonth, thisDay, 9, 14),
    content: `<p>Woke up earlier than usual today. The light through the blinds was soft and amber — the kind that makes you feel like time is moving slowly, on purpose. ceilings came on shuffle and I just let it play through, twice.</p><p>I've been thinking about where I want to be a year from now. Not in some grand-plan way, just curious. What habits will I have built? Will I feel more settled?</p><p>There's something about Lizzy McAlpine in the morning that strips everything back. Like being a child again, but with more to lose. In a good way.</p>`,
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
    content: `<p>Late night entry. Couldn't sleep so I opened the window and listened to the city. Somewhere around midnight I put on BIRDS OF A FEATHER and just sat with it. It hit differently tonight.</p><p>Today was hard in small ways. Nothing catastrophic, just a low hum of difficulty I couldn't shake. I needed to write it somewhere. Here it is.</p><p>Tomorrow I'm going to do one thing differently: step outside first thing, even just for five minutes, before looking at my phone.</p>`,
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
    content: `<p>Afternoon energy today. Went for a long walk with Like Real People Do in my ears and came back feeling like something had shifted — not dramatically, but in that quiet way where you notice you're breathing differently.</p><p>Met an old friend for coffee. We talked about how strange it is to grow up — that feeling you should have "figured it out" by now, and the slow realization that nobody really does.</p><p>Tonight I want to cook something that takes time. Music on, phone face-down.</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Morning walk ✓</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Cook a real dinner</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Read for 30 mins before bed</p></div></li></ul>`,
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
    content: `<p>Something I noticed this morning: I'm not dreading the day. That sounds small, but it isn't. A few years ago mornings felt like an obstacle. Now they just feel like mornings. Sparks came on and I actually laughed — it felt earned.</p><p>I've been journaling long enough to have records of this exact day across three years. It's strange and wonderful to read them. I can trace an arc — not a straight line, not a hero's journey, just a person figuring things out slowly.</p><p>If you're reading this as a demo: this is what Echo is really about. Not productivity. Not optimization. Just leaving a trail of yourself, so you can find your way back.</p>`,
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
