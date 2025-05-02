
import { corsHeaders } from "../utils/corsHeaders.ts";
import { createErrorResponse, createSuccessResponse } from "../utils/responseHelpers.ts";

export async function handleAuthorize(params, clientId) {
  const redirect_uri = params.redirect_uri;
  const scope = params.scope;
  const show_dialog = params.show_dialog === "true";
  
  console.log("Auth request params:", { redirect_uri, scope, show_dialog });
  
  if (!redirect_uri || !scope) {
    console.error("Missing required parameters for authorize endpoint");
    return createErrorResponse(400, "Missing required parameters");
  }
  
  if (!clientId) {
    console.error("Spotify Client ID is not configured");
    return createErrorResponse(500, "Spotify Client ID is not configured");
  }
  
  // Generate the authorization URL with the proper client ID
  console.log("Client ID type:", typeof clientId);
  console.log("Client ID length:", clientId.length);
  console.log("First 5 chars of Client ID:", clientId.substring(0, 5));
  
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(
    redirect_uri
  )}&scope=${encodeURIComponent(scope)}${show_dialog ? "&show_dialog=true" : ""}`;
  
  console.log("Generated auth URL:", authUrl);
  
  return createSuccessResponse({ url: authUrl });
}
