import { JournalEntry } from '@/types';

export const landingEntries: JournalEntry[] = [
  // Entry 1 — Rainy morning, content mood
  {
    id: 'landing-1',
    date: '2025-11-14',
    timestamp: '2025-11-14T16:22:00.000Z',
    mood: 'content',
    content: `<p>This is <strong>your space to write freely</strong>.</p>
<p>Eternal Entries captures everything around a moment — the <strong>weather</strong> outside your window, the <strong>song</strong> stuck in your head, your <strong>mood</strong>, your unfiltered thoughts. Not for anyone else. Just for you.</p>
<p>Every time you open this journal, you're creating a <strong>snapshot of who you are right now</strong>. And one day, you'll scroll back and be grateful you did.</p>`,
    weather: {
      temperature: 12,
      description: 'light rain',
      icon: 'cloud-rain',
      location: 'San Francisco, California',
    },
    track: {
      id: '1231267000',
      name: 'Holocene',
      artist: 'Bon Iver',
      album: 'Bon Iver',
      albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/91/e9/dc/91e9dcb0-6cf8-fc14-8cff-5a647c205da8/191515377708_Cover.jpg/300x300bb.jpg',
      uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/29/d6/22/29d622b3-7c5a-080d-facd-c2bf1a978116/mzaf_14239995033173837767.plus.aac.p.m4a',
      durationMs: 253269,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    createdAt: new Date('2025-11-14T09:22:00.000Z').getTime(),
    comments: [],
  },
  // Entry 2 — Clear sky evening, emotional mood (sun glow)
  {
    id: 'landing-2',
    date: '2025-06-21',
    timestamp: '2025-06-22T00:30:00.000Z',
    mood: 'emotional',
    content: `<p><strong>Every entry is a moment frozen in time.</strong></p>
<p>Come back a week later, a month later, a year later — and <strong>rediscover what you were feeling</strong>, what you were listening to, what the sky looked like. Your future self will read these words and feel something you forgot you felt.</p>
<p>That's the magic. Not in the writing — <strong>in the revisiting</strong>.</p>`,
    weather: {
      temperature: 20,
      description: 'clear sky',
      icon: 'thermometer-sun',
      location: 'New York, New York',
    },
    track: {
      id: '1806531961',
      name: 'The Night We Met',
      artist: 'Lord Huron',
      album: 'Strange Trails',
      albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/55/41/4a/55414a18-861a-79d1-e575-5bf8cf205dbe/886445056839_Cover.jpg/300x300bb.jpg',
      uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/4b/36/b7/4b36b739-1de7-e0ae-45da-9a66463127ac/mzaf_1821541347983595183.plus.aac.p.m4a',
      durationMs: 208227,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    createdAt: new Date('2025-06-21T22:45:00.000Z').getTime(),
    comments: [],
    reflectionQuestion: 'What moment from your past would you most want to revisit?',
    reflectionAnswer: 'The morning I woke up with nowhere to be, sunlight through the curtains, and nowhere I wanted to go. I didn\'t know it was special then. I do now.',
  },
  // Entry 3 — Clear sky evening, happy mood (orange sun glow)
  {
    id: 'landing-3',
    date: '2026-03-08',
    timestamp: '2026-03-08T23:00:00.000Z',
    mood: 'happy',
    content: `<p><strong>Search for any song</strong> and it becomes part of your entry.</p>
<p>A 30-second clip plays right here — not a link, not a redirect. The <strong>music is woven into the memory</strong>. When you come back to read this entry, the song plays and suddenly you're back in that exact moment.</p>
<p><strong>Try pressing play.</strong> You'll see what we mean.</p>`,
    weather: {
      temperature: 22,
      description: 'clear sky',
      icon: 'thermometer-sun',
      location: 'Los Angeles, California',
    },
    track: {
      id: '1440729744',
      name: 'Dog Days Are Over',
      artist: 'Florence + the Machine',
      album: 'Lungs',
      albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/46/45/58/46455821-202f-5fac-ee42-87853cb9fa03/09UMGIM14223.rgb.jpg/300x300bb.jpg',
      uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/93/0a/18/930a18f4-fc27-bbd8-0dc6-b064393a4f2b/mzaf_16426679391680895194.plus.aac.p.m4a',
      durationMs: 252853,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    createdAt: new Date('2026-03-08T21:30:00.000Z').getTime(),
    comments: [],
  },
  // Entry 4 — Heavy clouds, neutral mood (transitions to encryption)
  {
    id: 'landing-4',
    date: '2026-01-03',
    timestamp: '2026-01-03T18:00:00.000Z',
    mood: 'neutral',
    content: `<p><strong>Your entries are encrypted</strong> before they leave your device.</p>
<p>We use <strong>AES-256 encryption</strong> — the same standard used by banks and governments. Your thoughts are scrambled into unreadable data before they're ever stored. <strong>Not even we can read them.</strong></p>
<p>No ads. No data mining. <strong>No one reading over your shoulder.</strong> This is your journal, and it stays that way.</p>`,
    weather: {
      temperature: 8,
      description: 'heavy clouds',
      icon: 'cloud',
      location: 'London, England',
    },
    track: {
      id: '1123076826',
      name: 'Fix You',
      artist: 'Coldplay',
      album: 'X&Y',
      albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0c/82/48/0c8248a8-4a5b-d30d-8056-f32d650d2fc9/190295978068.jpg/300x300bb.jpg',
      uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e5/42/e3/e542e340-a45c-695e-e0b8-6155e222ebc0/mzaf_14955746616030397665.plus.aac.p.m4a',
      durationMs: 294992,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    createdAt: new Date('2026-01-03T18:30:00.000Z').getTime(),
    comments: [],
  },
];
