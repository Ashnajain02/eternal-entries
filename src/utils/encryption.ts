
/**
 * Encryption utilities for securing user data
 * Uses AES-GCM algorithm with a key derived from the user's ID
 */

/**
 * Derives an encryption key from the user ID using PBKDF2
 * @param userId The user's unique ID
 * @returns A Promise that resolves to a CryptoKey
 */
export const deriveKeyFromUserId = async (userId: string): Promise<CryptoKey> => {
  // Convert the userId to an ArrayBuffer to use as key material
  const encoder = new TextEncoder();
  const userIdBuffer = encoder.encode(userId);
  
  // Use a static salt for derivation (not ideal but maintains decryption capability)
  const salt = encoder.encode("journal-encryption-salt");
  
  // Import the user ID as raw key material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    userIdBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  // Derive an AES-GCM key using PBKDF2
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

/**
 * Encrypts text using AES-GCM
 * @param text Text to encrypt
 * @param userId User's ID for key derivation
 * @returns Encrypted data as a base64 string with IV
 */
export const encryptText = async (text: string, userId: string): Promise<string> => {
  try {
    if (!text || !userId) return text;
    
    const key = await deriveKeyFromUserId(userId);
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Generate a random IV for each encryption
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      data
    );
    
    // Combine IV and encrypted data into a single buffer
    const combinedData = new Uint8Array(iv.length + encryptedData.byteLength);
    combinedData.set(iv);
    combinedData.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combinedData));
  } catch (error) {
    console.error("Encryption failed:", error);
    return text; // Fallback to unencrypted text if encryption fails
  }
};

/**
 * Decrypts text using AES-GCM
 * @param encryptedText Base64 string with IV and encrypted data
 * @param userId User's ID for key derivation
 * @returns Decrypted text
 */
export const decryptText = async (encryptedText: string, userId: string): Promise<string> => {
  try {
    if (!encryptedText || !userId) return encryptedText;
    
    // Check if it's likely an encrypted string (simple heuristic)
    // Base64 strings usually don't contain typical text characters like spaces
    if (encryptedText.includes(' ') && !encryptedText.startsWith('eyJ')) {
      return encryptedText; // Likely not encrypted
    }
    
    const key = await deriveKeyFromUserId(userId);
    
    // Convert base64 to array buffer
    const binaryString = atob(encryptedText);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Extract IV (first 12 bytes)
    const iv = bytes.slice(0, 12);
    const encryptedData = bytes.slice(12);
    
    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      encryptedData
    );
    
    // Decode the decrypted data to text
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error("Decryption failed:", error);
    return encryptedText; // Return original text if decryption fails
  }
};

/**
 * Encrypts a journal entry object (only the content field)
 * @param entry The journal entry to encrypt
 * @param userId User's ID for encryption
 * @returns A copy of the entry with encrypted content
 */
export const encryptJournalEntry = async (entry: any, userId: string): Promise<any> => {
  if (!entry || !userId) return entry;
  
  const encryptedEntry = { ...entry };
  
  // Encrypt only the content field
  if (entry.content) {
    encryptedEntry.content = await encryptText(entry.content, userId);
  }
  
  return encryptedEntry;
};

/**
 * Decrypts a journal entry object (only the content field)
 * @param entry The journal entry to decrypt
 * @param userId User's ID for decryption
 * @returns A copy of the entry with decrypted content
 */
export const decryptJournalEntry = async (entry: any, userId: string): Promise<any> => {
  if (!entry || !userId) return entry;
  
  const decryptedEntry = { ...entry };
  
  // Decrypt only the content field
  if (entry.content) {
    decryptedEntry.content = await decryptText(entry.content, userId);
  }
  
  return decryptedEntry;
};
