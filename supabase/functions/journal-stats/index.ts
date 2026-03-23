import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function wordCount(text: string): number {
  const stripped = stripHtml(text);
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  try {
    // Extract bearer token
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Missing API key" }, 401);

    // Strip the "echo_" prefix before hashing
    const rawKey = token.startsWith("echo_") ? token.slice(5) : token;
    const keyHash = await hashKey(rawKey);

    // Admin client to look up key and query data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Look up API key
    const { data: apiKey, error: keyError } = await admin
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .single();

    if (keyError || !apiKey) return json({ error: "Invalid API key" }, 401);

    // Rate limiting
    const now = new Date();
    const resetAt = new Date(apiKey.rate_limit_reset_at);
    let count = apiKey.rate_limit_count;

    if (now > resetAt) {
      // Reset window
      count = 0;
      await admin
        .from("api_keys")
        .update({
          rate_limit_count: 1,
          rate_limit_reset_at: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS).toISOString(),
          last_used_at: now.toISOString(),
        })
        .eq("id", apiKey.id);
    } else if (count >= RATE_LIMIT_MAX) {
      return json(
        { error: "Rate limit exceeded. Try again later.", reset_at: resetAt.toISOString() },
        429
      );
    } else {
      await admin
        .from("api_keys")
        .update({
          rate_limit_count: count + 1,
          last_used_at: now.toISOString(),
        })
        .eq("id", apiKey.id);
    }

    const userId = apiKey.user_id;

    // Fetch all entries for this user
    const { data: entries, error: entriesError } = await admin
      .from("journal_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "published")
      .order("timestamp_started", { ascending: false });

    if (entriesError) throw entriesError;

    // Fetch habits
    const { data: habits } = await admin
      .from("habits")
      .select("id, name, created_at")
      .eq("user_id", userId);

    const { data: habitCompletions } = await admin
      .from("habit_completions")
      .select("habit_id, completed_date")
      .eq("user_id", userId);

    if (!entries || entries.length === 0) {
      return json({
        totalEntries: 0,
        message: "No published entries found.",
      });
    }

    // ── Streaks ──
    const entryDates = [
      ...new Set(
        entries.map((e) =>
          new Date(e.timestamp_started).toISOString().slice(0, 10)
        )
      ),
    ].sort((a, b) => b.localeCompare(a)); // newest first

    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 1;

    // Current streak: count consecutive days from today backwards
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (entryDates[0] === today || entryDates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < entryDates.length; i++) {
        const prev = new Date(entryDates[i - 1]);
        const curr = new Date(entryDates[i]);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Longest streak
    for (let i = 1; i < entryDates.length; i++) {
      const prev = new Date(entryDates[i - 1]);
      const curr = new Date(entryDates[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak, currentStreak);

    // ── Time patterns ──
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    entries.forEach((e) => {
      const d = new Date(e.timestamp_started);
      const hour = d.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[d.getDay()] = (dayCounts[d.getDay()] || 0) + 1;
    });

    const favoriteHour = Object.entries(hourCounts).sort(
      ([, a], [, b]) => b - a
    )[0];
    const favoriteDay = Object.entries(dayCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    const formatHour = (h: number) => {
      if (h === 0) return "12 AM";
      if (h === 12) return "12 PM";
      return h > 12 ? `${h - 12} PM` : `${h} AM`;
    };

    // ── This week / month / year ──
    const nowMs = Date.now();
    const weekAgo = nowMs - 7 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

    let entriesThisWeek = 0;
    let entriesThisMonth = 0;
    let entriesThisYear = 0;

    entries.forEach((e) => {
      const t = new Date(e.timestamp_started).getTime();
      if (t >= weekAgo) entriesThisWeek++;
      if (t >= monthStart) entriesThisMonth++;
      if (t >= yearStart) entriesThisYear++;
    });

    const avgEntriesPerWeek =
      entries.length > 1
        ? +(
            entries.length /
            ((nowMs - new Date(entries[entries.length - 1].timestamp_started).getTime()) /
              (7 * 86400000))
          ).toFixed(1)
        : entries.length;

    // ── Mood ──
    const moodCounts: Record<string, number> = {};
    const moodCountsThisMonth: Record<string, number> = {};

    entries.forEach((e) => {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      const t = new Date(e.timestamp_started).getTime();
      if (t >= monthStart) {
        moodCountsThisMonth[e.mood] = (moodCountsThisMonth[e.mood] || 0) + 1;
      }
    });

    const topMood = Object.entries(moodCounts).sort(([, a], [, b]) => b - a)[0];
    const topMoodThisMonth = Object.entries(moodCountsThisMonth).sort(
      ([, a], [, b]) => b - a
    )[0];

    // ── Music ──
    const entriesWithSongs = entries.filter((e) => e.spotify_track_name);
    const artistCounts: Record<string, number> = {};
    entriesWithSongs.forEach((e) => {
      if (e.spotify_track_artist) {
        artistCounts[e.spotify_track_artist] =
          (artistCounts[e.spotify_track_artist] || 0) + 1;
      }
    });
    const topArtist = Object.entries(artistCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    const recentSong = entriesWithSongs[0];

    // ── Weather ──
    const entriesWithWeather = entries.filter((e) => e.weather_description);
    const weatherCounts: Record<string, number> = {};
    let tempSum = 0;
    let tempCount = 0;
    const locationCounts: Record<string, number> = {};

    entriesWithWeather.forEach((e) => {
      if (e.weather_description) {
        weatherCounts[e.weather_description] =
          (weatherCounts[e.weather_description] || 0) + 1;
      }
      if (e.weather_temperature != null) {
        tempSum += e.weather_temperature;
        tempCount++;
      }
      if (e.weather_location) {
        locationCounts[e.weather_location] =
          (locationCounts[e.weather_location] || 0) + 1;
      }
    });

    const topWeather = Object.entries(weatherCounts).sort(
      ([, a], [, b]) => b - a
    )[0];
    const topLocation = Object.entries(locationCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    // ── Writing ──
    const wordCounts = entries.map((e) => ({
      words: wordCount(e.entry_text),
      date: e.timestamp_started,
    }));
    const totalWords = wordCounts.reduce((sum, e) => sum + e.words, 0);
    const avgWordCount = +(totalWords / entries.length).toFixed(0);
    const longestEntry = wordCounts.sort((a, b) => b.words - a.words)[0];
    const entriesWithReflections = entries.filter(
      (e) => e.reflection_question && e.reflection_answer
    ).length;

    // Count entries with task lists
    const entriesWithTasks = entries.filter(
      (e) => e.entry_text && e.entry_text.includes('data-type="taskList"')
    ).length;

    // ── Habits ──
    let habitsStats = null;
    if (habits && habits.length > 0 && habitCompletions) {
      const habitStreaks: { name: string; streak: number }[] = [];

      habits.forEach((habit) => {
        const completions = habitCompletions
          .filter((c) => c.habit_id === habit.id)
          .map((c) => c.completed_date)
          .sort((a, b) => b.localeCompare(a));

        let hStreak = 0;
        if (completions.length > 0) {
          const todayStr = new Date().toISOString().slice(0, 10);
          const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          if (completions[0] === todayStr || completions[0] === yesterdayStr) {
            hStreak = 1;
            for (let i = 1; i < completions.length; i++) {
              const prev = new Date(completions[i - 1]);
              const curr = new Date(completions[i]);
              if ((prev.getTime() - curr.getTime()) / 86400000 === 1) {
                hStreak++;
              } else break;
            }
          }
        }
        habitStreaks.push({ name: habit.name, streak: hStreak });
      });

      const bestHabit = habitStreaks.sort((a, b) => b.streak - a.streak)[0];

      habitsStats = {
        activeHabits: habits.length,
        bestHabitStreak: bestHabit
          ? { name: bestHabit.name, streak: bestHabit.streak }
          : null,
      };
    }

    // ── Day of week distribution ──
    const dayDistribution = dayNames.map((name, i) => ({
      day: name,
      entries: dayCounts[i] || 0,
    }));

    // ── Build response ──
    const stats = {
      streaks: {
        current: currentStreak,
        longest: longestStreak,
      },
      activity: {
        totalEntries: entries.length,
        entriesThisWeek,
        entriesThisMonth,
        entriesThisYear,
        avgEntriesPerWeek,
      },
      timePatterns: {
        favoriteHour: favoriteHour
          ? { hour: formatHour(Number(favoriteHour[0])), count: favoriteHour[1] }
          : null,
        favoriteDay: favoriteDay
          ? { day: dayNames[Number(favoriteDay[0])], count: favoriteDay[1] }
          : null,
        dayDistribution,
      },
      mood: {
        current: entries[0]?.mood || null,
        mostFrequent: topMood ? { mood: topMood[0], count: topMood[1] } : null,
        mostFrequentThisMonth: topMoodThisMonth
          ? { mood: topMoodThisMonth[0], count: topMoodThisMonth[1] }
          : null,
        distribution: moodCounts,
      },
      music: {
        recentSong: recentSong
          ? {
              name: recentSong.spotify_track_name,
              artist: recentSong.spotify_track_artist,
              album: recentSong.spotify_track_album,
              albumArt: recentSong.spotify_track_image,
            }
          : null,
        topArtist: topArtist ? { artist: topArtist[0], count: topArtist[1] } : null,
        entriesWithSongs: entriesWithSongs.length,
        entriesWithoutSongs: entries.length - entriesWithSongs.length,
        uniqueArtists: Object.keys(artistCounts).length,
      },
      weather: {
        mostCommonCondition: topWeather
          ? { condition: topWeather[0], count: topWeather[1] }
          : null,
        averageTemperatureCelsius: tempCount > 0 ? +(tempSum / tempCount).toFixed(1) : null,
        mostCommonLocation: topLocation
          ? { location: topLocation[0], count: topLocation[1] }
          : null,
      },
      writing: {
        totalWords,
        avgWordCount,
        longestEntry: longestEntry
          ? { words: longestEntry.words, date: longestEntry.date }
          : null,
        entriesWithReflections,
        entriesWithTasks,
      },
      habits: habitsStats,
    };

    return json(stats);
  } catch (error) {
    console.error("journal-stats error:", error);
    return json({ error: "Failed to compute stats" }, 500);
  }
});
