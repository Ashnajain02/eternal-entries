# Eternal Entries

A private journaling app that captures the full context of a moment — your words, the weather, the song you were listening to, your mood — and encrypts everything client-side before it ever leaves your device.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (CLIENT)                           │
│                                                                     │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────────┐  │
│  │  AuthContext  │  │ JournalContext│  │    DraftsContext          │  │
│  │              │  │               │  │                           │  │
│  │ session      │  │ entries[]     │  │ drafts[]                  │  │
│  │ signIn/Out   │  │ addEntry      │  │ saveDraft (auto, 1s)     │  │
│  │ signUp       │  │ updateEntry   │  │ publishDraft              │  │
│  │              │  │ deleteEntry   │  │ deleteDraft               │  │
│  │              │  │ comments      │  │                           │  │
│  └──────┬───────┘  └───────┬───────┘  └────────────┬──────────────┘  │
│         │                  │                       │                 │
│         │           ┌──────┴───────────────────────┘                 │
│         │           │                                                │
│         │    ┌──────┴──────────────────────────────┐                 │
│         │    │       ENCRYPTION LAYER              │                 │
│         │    │                                     │                 │
│         │    │  Content + Comments → JSON           │                 │
│         │    │       ↓                             │                 │
│         │    │  AES-256-GCM Encrypt                │                 │
│         │    │  (key from PBKDF2, 100K iterations) │                 │
│         │    │       ↓                             │                 │
│         │    │  Base64(IV + Ciphertext)             │                 │
│         │    │                                     │                 │
│         │    │  Metadata stays plaintext:           │                 │
│         │    │  mood, date, weather, track info     │                 │
│         │    └──────────────┬──────────────────────┘                 │
│         │                  │                                        │
└─────────┼──────────────────┼────────────────────────────────────────┘
          │                  │
          │     HTTPS/TLS    │
          │                  │
┌─────────┼──────────────────┼────────────────────────────────────────┐
│         │       SUPABASE   │                                        │
│         │                  │                                        │
│  ┌──────┴───────┐  ┌──────┴───────────────────────────────────┐     │
│  │  Auth        │  │  PostgreSQL (journal_entries)             │     │
│  │              │  │                                          │     │
│  │  JWT tokens  │  │  id, user_id, status                     │     │
│  │  OAuth       │  │  entry_text ← ENCRYPTED (AES-256-GCM)   │     │
│  │  Sessions    │  │  mood, timestamp_started, timezone        │     │
│  │              │  │  weather_*, spotify_track_*  ← plaintext │     │
│  └──────────────┘  │  reflection_question, reflection_answer  │     │
│                    └──────────────────────────────────────────┘     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    EDGE FUNCTIONS (Deno)                      │   │
│  │                                                              │   │
│  │  journal-stats ─── Aggregated analytics (API key auth)       │   │
│  │  journal-info ──── Entry metadata by date (API key auth)     │   │
│  │  generate-reflection ── AI reflection questions (JWT auth)   │   │
│  │  generate-api-key ──── Create/revoke API keys (JWT auth)     │   │
│  │  itunes-search ──────── Proxy iTunes music search (public)   │   │
│  │  auth-test ──────────── Verify JWT validity (JWT auth)       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Encryption Architecture

### What's Encrypted

| Field | Encrypted? | Why |
|-------|-----------|-----|
| Entry text + comments | Yes (AES-256-GCM) | Private journal content |
| Mood | No | Needed for filtering/stats |
| Date/time/timezone | No | Needed for sorting/display |
| Weather data | No | Needed for weather overlay rendering |
| Track info | No | Needed for music player rendering |
| Reflection Q&A | No | Stored server-side for AI features |

### Encryption Flow

```
WRITE PATH                              READ PATH
─────────                               ─────────

User types in editor                    App loads entries from DB
       │                                        │
       ▼                                        ▼
{ content, comments[] }                 Base64 string from entry_text
       │                                        │
       ▼                                        ▼
JSON.stringify({                        Base64 decode → byte array
  content: "...",                               │
  comments: [...]                               ▼
})                                      Extract IV (bytes 0-11)
       │                                Extract ciphertext (bytes 12+)
       ▼                                        │
Derive AES-256 key ◄─── userId                  ▼
(PBKDF2, 100K iter,     + static       Derive AES-256 key ◄─── userId
 SHA-256, cached)        salt           (same params, cached)
       │                                        │
       ▼                                        ▼
Generate random IV                      AES-GCM Decrypt(key, iv, ciphertext)
(12 bytes)                                      │
       │                                        ▼
       ▼                                JSON.parse → { content, comments }
AES-GCM Encrypt(key, iv, plaintext)             │
       │                                        ▼
       ▼                                Render in UI
Combine: IV + Ciphertext
       │
       ▼
Base64 encode → store in DB
```

### Key Derivation

```
userId (UUID string)
       │
       ▼
PBKDF2 Key Material
       │
       ├── Salt: "journal-encryption-salt" (static)
       ├── Iterations: 100,000
       ├── Hash: SHA-256
       │
       ▼
AES-GCM Key (256-bit)
       │
       ▼
Cached in memory (Map<userId, CryptoKey>)
Cleared on logout
```

### Security Properties

- **Client-side only**: Encryption/decryption happens entirely in the browser
- **Zero-knowledge server**: The server stores ciphertext and cannot decrypt it
- **Per-entry IV**: Each encryption uses a fresh random 12-byte IV
- **Key caching**: PBKDF2 derivation runs once per session, not per entry
- **Metadata queryable**: Unencrypted metadata enables search, filtering, and stats without exposing content

## Data Flow

### Draft → Publish Lifecycle

```
1. User clicks "New Entry"
   └─ createNewDraft() → { id: "draft-xxx", content: "", date, timestamp, timezone }

2. User types
   └─ autoSaveDraft() fires after 1s debounce
      └─ saveDraft() → encrypt → INSERT/UPDATE journal_entries (status='draft')
      └─ Returns real DB id, updates local state

3. User clicks "Publish"
   └─ Cancel pending auto-save timeout
   └─ await saveDraft(entry) → ensures latest content is in DB
   └─ UPDATE journal_entries SET status='published' WHERE id=savedId
   └─ Add to JournalContext entries, remove from drafts
```

### Provider Hierarchy

```
QueryClientProvider          (React Query cache)
  └─ TooltipProvider         (UI tooltips)
    └─ AuthProvider          (auth state, login/signup)
      └─ VisitLogger         (page visit tracking)
        └─ JournalProvider   (published entries, CRUD, comments)
          └─ DraftsProvider  (draft management, auto-save)
            └─ BrowserRouter
              └─ Routes
```

## API Endpoints

### journal-stats `GET /functions/v1/journal-stats`

Returns aggregated journal analytics. Auth: API key (`Bearer echo_xxx`).

```json
{
  "streaks": { "current": 5, "longest": 12 },
  "activity": {
    "totalEntries": 74,
    "lastEntryDate": "2026-03-23T22:45:35.555+00:00",
    "firstEntryDate": "2025-05-04T03:09:34.072+00:00",
    "totalDaysJournaled": 49,
    "entriesThisWeek": 3,
    "entriesThisMonth": 12,
    "entriesThisYear": 42,
    "avgEntriesPerWeek": 1.2
  },
  "mood": {
    "current": "happy",
    "mostFrequent": { "mood": "content", "count": 22 },
    "distribution": { "happy": 15, "content": 22, "neutral": 18, "sad": 5 }
  },
  "weather": {
    "mostCommonCondition": { "condition": "Clear sky", "count": 37 },
    "averageTemperatureCelsius": 18.5,
    "distribution": { "Clear sky": 37, "Overcast": 14, "Drizzle": 3 }
  },
  "music": { "topArtist": { "artist": "Bon Iver", "count": 8 }, "entriesWithSongs": 45 },
  "writing": { "totalWords": 28500, "avgWordCount": 385 },
  "habits": { "activeHabits": 4, "bestHabitStreak": { "name": "Meditate", "streak": 8 } }
}
```

### journal-info `GET /functions/v1/journal-info?year=2026&month=3&day=23`

Returns entry metadata (no content) for a date. Auth: API key. Params: `year`, `month`, `day` (at least one required).

```json
{
  "entries": [{
    "id": "uuid",
    "timestamp": "2026-03-23T22:45:35.555+00:00",
    "timezone": "America/New_York",
    "date": "2026-03-23",
    "mood": "happy",
    "weather": { "temperature": 18, "description": "clear sky", "location": "New York, NY" },
    "track": { "name": "Holocene", "artist": "Bon Iver", "album": "Bon Iver, Bon Iver" },
    "reflection": { "question": "What made today meaningful?", "hasAnswer": true }
  }],
  "count": 1
}
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + shadcn/ui (Radix) |
| Routing | React Router v6 |
| State | React Context + TanStack Query |
| Editor | Tiptap (ProseMirror) |
| Animation | Framer Motion + Canvas API |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Edge Runtime | Deno |
| Encryption | Web Crypto API (AES-256-GCM + PBKDF2) |
| Music | iTunes Search API + HTML5 Audio |
| Testing | Vitest |

## Development

```sh
git clone <repo-url>
cd eternal-entries
npm install
npm run dev        # http://localhost:8080
npm run build      # Production build
npm run lint       # ESLint
```

### Supabase

```sh
npx supabase db push                           # Apply migrations
npx supabase functions deploy journal-stats    # Deploy edge function
npx supabase functions deploy journal-info
```

### Environment

The app connects to Supabase using credentials in `src/integrations/supabase/client.ts`. Edge functions use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the runtime environment.
