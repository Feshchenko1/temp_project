/**
 * Web Crypto API Utility for End-to-End Encryption (E2EE)
 * Generates asymmetric keys (RSA-OAEP) and handles payload encryption.
 */

// Generate an RSA-OAEP key pair for the user
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
  return keyPair;
};

// Export public key to base64 for database storage
export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  return btoa(exportedAsString);
};

// Import a base64 public key from the database
export const importPublicKey = async (base64Key) => {
  const binaryDerString = window.atob(base64Key);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
};

// Generate symmetric AES-GCM key for a generic session/chat group
export const generateSymmetricKey = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// Encrypt payload (message text) using AES-GCM
export const encryptMessage = async (aesKey, plaintext) => {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    enc.encode(plaintext)
  );

  // Return base64 of IV + Ciphertext
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ivBase64}.${cipherBase64}`;
};

// Decrypt payload using AES-GCM
export const decryptMessage = async (aesKey, encryptedPayload) => {
  const [ivBase64, cipherBase64] = encryptedPayload.split(".");
  const iv = new Uint8Array(atob(ivBase64).split("").map((c) => c.charCodeAt(0)));
  const ciphertext = new Uint8Array(atob(cipherBase64).split("").map((c) => c.charCodeAt(0)));

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
};

// Used to encrypt the AES-GCM key with a peer's public RSA key (Sender Keys pattern)
export const encryptSymmetricKey = async (recipientPublicKey, aesKey) => {
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    exportedAesKey
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
};

// Used to decrypt the AES-GCM key that a sender encrypted for us
export const decryptSymmetricKey = async (ourPrivateKey, base64EncryptedAesKey) => {
  const encryptedArray = new Uint8Array(
    atob(base64EncryptedAesKey).split("").map((c) => c.charCodeAt(0))
  );
  const decryptedRaw = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    ourPrivateKey,
    encryptedArray
  );

  return await window.crypto.subtle.importKey(
    "raw",
    decryptedRaw,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
};
