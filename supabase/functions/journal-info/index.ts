import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // ── Auth (same API key flow as journal-stats) ──
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Missing API key" }, 401);

    const rawKey = token.startsWith("echo_") ? token.slice(5) : token;
    const keyHash = await hashKey(rawKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: apiKey, error: keyError } = await admin
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .single();

    if (keyError || !apiKey) return json({ error: "Invalid API key" }, 401);

    // ── Rate limiting ──
    const now = new Date();
    const resetAt = new Date(apiKey.rate_limit_reset_at);
    let count = apiKey.rate_limit_count;

    if (now > resetAt) {
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

    // ── Parse query params ──
    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");
    const day = url.searchParams.get("day");

    if (!year && !month && !day) {
      return json({ error: "At least one of year, month, or day is required." }, 400);
    }

    // ── Fetch entries ──
    let query = admin
      .from("journal_entries")
      .select(
        "id, timestamp_started, mood, weather_temperature, weather_description, weather_icon, weather_location, spotify_track_name, spotify_track_artist, spotify_track_album, spotify_track_image, reflection_question, reflection_answer"
      )
      .eq("user_id", userId)
      .eq("status", "published")
      .order("timestamp_started", { ascending: false });

    const { data: entries, error: entriesError } = await query;
    if (entriesError) throw entriesError;
    if (!entries || entries.length === 0) {
      return json({ entries: [], count: 0 });
    }

    // ── Filter by date parts client-side (timestamp is stored as ISO string) ──
    const filtered = entries.filter((e) => {
      const d = new Date(e.timestamp_started);
      if (year && d.getFullYear() !== parseInt(year)) return false;
      if (month && d.getMonth() + 1 !== parseInt(month)) return false;
      if (day && d.getDate() !== parseInt(day)) return false;
      return true;
    });

    // ── Map to response shape (no content) ──
    const result = filtered.map((e) => ({
      id: e.id,
      timestamp: e.timestamp_started,
      date: new Date(e.timestamp_started).toISOString().slice(0, 10),
      mood: e.mood,
      weather: e.weather_description
        ? {
            temperature: e.weather_temperature,
            description: e.weather_description,
            icon: e.weather_icon,
            location: e.weather_location,
          }
        : null,
      track: e.spotify_track_name
        ? {
            name: e.spotify_track_name,
            artist: e.spotify_track_artist,
            album: e.spotify_track_album,
            albumArt: e.spotify_track_image,
          }
        : null,
      reflection: e.reflection_question
        ? {
            question: e.reflection_question,
            hasAnswer: !!e.reflection_answer,
          }
        : null,
    }));

    return json({ entries: result, count: result.length });
  } catch (error) {
    console.error("journal-info error:", error);
    return json({ error: "Failed to fetch entry info" }, 500);
  }
});
