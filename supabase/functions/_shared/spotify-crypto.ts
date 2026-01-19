/**
 * Shared encryption/decryption utilities for Spotify tokens
 * Used across spotify-auth, spotify-playback-token, and spotify-search edge functions
 */

export async function encryptToken(token: string): Promise<string> {
  const encryptionKey = Deno.env.get("SPOTIFY_TOKEN_ENCRYPTION_KEY");
  if (!encryptionKey) {
    throw new Error("Encryption key not configured");
  }

  const keyData = new TextEncoder().encode(encryptionKey);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptToken(encryptedToken: string): Promise<string> {
  const encryptionKey = Deno.env.get("SPOTIFY_TOKEN_ENCRYPTION_KEY");
  if (!encryptionKey) {
    throw new Error("Encryption key not configured");
  }

  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const keyData = new TextEncoder().encode(encryptionKey);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}
