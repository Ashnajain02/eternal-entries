
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get environment variables
export function getEnvironmentVariables() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET") || "";
  
  return {
    supabaseUrl,
    supabaseAnonKey,
    clientId,
    clientSecret
  };
}

// Create a Supabase client
export function createSupabaseClient(url: string, key: string) {
  return createClient(url, key);
}

// Verify that a profile exists or create it
export async function ensureProfile(supabase: any, userId: string) {
  try {
    // Check if the profile exists
    const { data: profileData, error: profileCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
      
    if (profileCheckError) {
      console.error("Error checking if profile exists:", profileCheckError);
      return false;
    } 
    
    if (!profileData) {
      console.log(`Profile does not exist for user ${userId}, creating one`);
      
      try {
        // Create a new profile with minimal data
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert([{ id: userId }]);
          
        if (createProfileError) {
          console.error("Failed to create profile:", createProfileError);
          
          // Try to use the RPC function as fallback
          console.log("Attempting to use RPC function as fallback for profile creation");
          const { error: rpcError } = await supabase.rpc(
            "update_profile_spotify_data",
            {
              p_user_id: userId,
              p_access_token: '',
              p_refresh_token: '',
              p_expires_at: new Date().toISOString(),
              p_username: 'New User'
            }
          );
          
          if (rpcError) {
            console.error("RPC creation fallback also failed:", rpcError);
            return false;
          } else {
            console.log("Successfully created profile using RPC function");
            return true;
          }
        } else {
          console.log("Successfully created profile for user");
          return true;
        }
      } catch (profileCreationError) {
        console.error("Exception during profile creation:", profileCreationError);
        return false;
      }
    } else {
      console.log(`Found existing profile for user ${userId}`);
      return true;
    }
  } catch (error) {
    console.error("Error in ensureProfile:", error);
    return false;
  }
}
