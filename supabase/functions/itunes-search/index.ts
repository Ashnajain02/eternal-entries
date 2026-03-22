import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { query, limit = 8 } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const clampedLimit = Math.min(Math.max(1, Number(limit)), 25);
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=${clampedLimit}`;

    const response = await fetch(url);
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "iTunes search failed" }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify({ results: data.results || [] }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("iTunes search proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Search failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
