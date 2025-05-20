
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { encode as base64Encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID') || '834fb4c11be949b2b527500c41e2cec5';
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET') || '91843f81dc254191988e61a23993aa18';
const REDIRECT_URI = 'https://eternal-entries.vercel.app/callback';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Create a Supabase client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Authorization URL endpoint
    if (path === 'authorize') {
      const scopes = [
        'user-read-private',
        'user-read-email',
        'user-read-currently-playing',
        'user-read-playback-state'
      ];
      
      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.append('scope', scopes.join(' '));
      
      // Generate a random state for CSRF protection
      const state = crypto.randomUUID();
      authUrl.searchParams.append('state', state);
      
      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      });
    }
    
    // Callback endpoint to exchange code for token
    if (path === 'callback') {
      const requestData = await req.json();
      const { code } = requestData;
      
      if (!code) {
        return new Response(JSON.stringify({ error: 'Authorization code is required' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400
        });
      }
      
      const authHeader = base64Encode(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
      
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        return new Response(JSON.stringify({ error: tokenData.error }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400
        });
      }
      
      // Get user info from Spotify
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      const userData = await userResponse.json();
      
      // Get the user's ID from the JWT token in the request
      const authorizationHeader = req.headers.get('Authorization');
      if (!authorizationHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 401
        });
      }
      
      const token = authorizationHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 401
        });
      }
      
      // Calculate token expiry time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
      
      // Store tokens in the user's profile
      const { error: updateError } = await supabaseAdmin.rpc('update_profile_spotify_data', {
        p_user_id: user.id,
        p_access_token: tokenData.access_token,
        p_refresh_token: tokenData.refresh_token,
        p_expires_at: expiresAt.toISOString(),
        p_username: userData.id
      });
      
      if (updateError) {
        console.error('Error updating profile:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to save Spotify credentials' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 500
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        profile: {
          display_name: userData.display_name,
          spotify_id: userData.id,
          email: userData.email,
          avatar: userData.images?.[0]?.url
        }
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      });
    }
    
    // Search endpoint
    if (path === 'search') {
      const requestData = await req.json();
      const { query, userId } = requestData;
      
      if (!query) {
        return new Response(JSON.stringify({ error: 'Search query is required' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400
        });
      }
      
      // Check if token is expired
      const { data: isExpired } = await supabaseAdmin.rpc('is_spotify_token_expired', {
        user_id: userId
      });
      
      if (isExpired) {
        // Token is expired, we need to refresh it
        // This would be implemented in a real app
        return new Response(JSON.stringify({ error: 'Spotify token expired. Please reconnect your Spotify account.' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 401
        });
      }
      
      // Get access token for the user
      const { data: accessToken } = await supabaseAdmin.rpc('get_user_spotify_token', {
        user_id: userId
      });
      
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Spotify not connected' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 401
        });
      }
      
      // Call Spotify API to search for tracks
      const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const searchData = await searchResponse.json();
      
      if (searchData.error) {
        return new Response(JSON.stringify({ error: searchData.error.message }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400
        });
      }
      
      // Transform Spotify track data to our format
      const tracks = searchData.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        albumArt: track.album.images[0]?.url,
        uri: track.uri
      }));
      
      return new Response(JSON.stringify({ tracks }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      });
    }
    
    // If no matching path is found
    return new Response(JSON.stringify({ error: 'Not found' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 404
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500
    });
  }
});
