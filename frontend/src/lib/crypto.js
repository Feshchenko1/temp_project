/**
 * Web Crypto API Utility for End-to-End Encryption (E2EE)
 * Handles RSA-OAEP for key exchange and AES-GCM for message encryption.
 * Stores private keys securely in IndexedDB.
 */

const DB_NAME = "HarmonixCryptoDB";
const STORE_NAME = "privateKeys";
const SESSION_STORE_NAME = "sessionKeys";

// --- IndexedDB Helpers ---

const openDB = () => {
  return new Promise((resolve, reject) => {
    // Migration: Version 2 adds 'sessionKeys' store for persisting AES keys locally
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(SESSION_STORE_NAME)) {
        db.createObjectStore(SESSION_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const savePrivateKey = async (userId, privateKey) => {
  const db = await openDB();
  const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(jwk, userId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const removePrivateKey = async (userId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(userId);
    request.onsuccess = () => {
      console.log(`[E2EE] Private key purged for ${userId}`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const getPrivateKey = async (userId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(userId);
    request.onsuccess = async () => {
      if (!request.result) return resolve(null);
      try {
        const privateKey = await window.crypto.subtle.importKey(
          "jwk",
          request.result,
          {
            name: "RSA-OAEP",
            hash: "SHA-256",
          },
          true,
          ["decrypt"]
        );
        resolve(privateKey);
      } catch (err) {
        console.error(`[E2EE] Failed to import private key for ${userId}. Data may be corrupted. Purging...`, err);
        // Self-healing: Delete corrupted key so it doesn't block future initializations
        await removePrivateKey(userId);
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// --- Session (AES) Persistence ---

export const saveSessionKey = async (chatId, aesKey) => {
  const db = await openDB();
  const jwk = await window.crypto.subtle.exportKey("jwk", aesKey);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SESSION_STORE_NAME);
    const request = store.put(jwk, chatId);
    request.onsuccess = () => {
      console.log(`[E2EE] Session key cached locally for chat: ${chatId}`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const getSessionKey = async (chatId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE_NAME, "readonly");
    const store = transaction.objectStore(SESSION_STORE_NAME);
    const request = store.get(chatId);
    request.onsuccess = async () => {
      if (!request.result) return resolve(null);
      try {
        const aesKey = await window.crypto.subtle.importKey(
          "jwk",
          request.result,
          { name: "AES-GCM" },
          true,
          ["encrypt", "decrypt"]
        );
        resolve(aesKey);
      } catch (err) {
        console.error(`[E2EE] Failed to import session key for ${chatId}. Corrupted entry removed.`);
        const delTx = db.transaction(SESSION_STORE_NAME, "readwrite");
        delTx.objectStore(SESSION_STORE_NAME).delete(chatId);
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Completely wipes the Harmonix Crypto Database.
 * Used during logout to ensure zero-trace and prevent identity bleeding.
 */
export const clearCryptoDatabase = async () => {
  return new Promise((resolve, reject) => {
    console.log("[E2EE] Initiating full crypto database wipe...");
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      console.log("[E2EE] Crypto database cleared successfully.");
      resolve();
    };

    request.onerror = (event) => {
      console.error("[E2EE] Error clearing crypto database:", event.target.error);
      reject(event.target.error);
    };

    request.onblocked = () => {
      console.warn("[E2EE] Database wipe blocked. Please close other open tabs of Harmonix.");
      // We resolve anyway to not block the logout UI flow, 
      // but the data might persist until tabs are closed.
      resolve();
    };
  });
};


// --- RSA Helpers (Key Exchange) ---

export const generateKeyPair = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
};

export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey("jwk", publicKey);
  return JSON.stringify(exported);
};

export const importPublicKey = async (publicKeyString) => {
  try {
    const jwk = JSON.parse(publicKeyString);
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );
  } catch (error) {
    console.error("[E2EE] Failed to import public key (JWK format expected):", error);
    throw error;
  }
};

/**
 * High-level helper: Generates a new RSA pair, stores private key in IDB, 
 * and returns the Base64 exported public key.
 */
export const generateAndStoreRSAKeys = async (userId) => {
  console.log(`[E2EE] Generating fresh identity for user ${userId}...`);
  const pair = await generateKeyPair();
  await savePrivateKey(userId, pair.privateKey);
  const pubKeyString = await exportPublicKey(pair.publicKey);
  console.log(`[E2EE] Identity generated. Public key exported.`);
  return pubKeyString;
};

// --- AES Helpers (Symmetric Encryption) ---

export const generateSymmetricKey = async () => {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

export const encryptSymmetricKey = async (recipientPublicKey, aesKey) => {
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    exportedAesKey
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
};

export const decryptSymmetricKey = async (ourPrivateKey, base64EncryptedAesKey) => {
  try {
    // Robust Base64-to-Uint8Array conversion using explicit loop
    // to ensure absolute buffer structural integrity for WebCrypto.
    const binaryString = window.atob(base64EncryptedAesKey);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const decryptedRaw = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      ourPrivateKey,
      bytes
    );

    return await window.crypto.subtle.importKey(
      "raw",
      decryptedRaw,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  } catch (err) {
    console.error(`[E2EE] RSA Decryption failed. Possible key mismatch or truncated payload.`, err);
    throw err;
  }
};

/**
 * Rotates the session AES key for a chat.
 * Generates a new key and encrypts it for each recipient's public key.
 */
export const rotateSessionKey = async (members) => {
  console.log(`[E2EE] Rotating session key for ${members.length} members...`);
  const newAesKey = await generateSymmetricKey();
  const encryptedKeys = await Promise.all(
    members.map(async (member) => {
      if (!member.publicKey) {
        console.warn(`[E2EE] Member ${member.fullName} (${member.id}) is missing a public key. Skipping.`);
        return null;
      }
      try {
        const pubKey = await importPublicKey(member.publicKey);
        const encrypted = await encryptSymmetricKey(pubKey, newAesKey);
        return {
          recipientId: member.id,
          encryptedAesKey: encrypted
        };
      } catch (err) {
        console.error(`[E2EE] Failed to encrypt session key for ${member.fullName}:`, err);
        return null;
      }
    })
  );

  const validKeys = encryptedKeys.filter(k => k !== null);
  console.log(`[E2EE] Session key rotated. Valid keys: ${validKeys.length}/${members.length}`);
  
  return { newAesKey, encryptedKeys: validKeys };
};

// --- Message Encryption ---

export const encryptMessage = async (aesKey, plaintext) => {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    enc.encode(plaintext)
  );

  const ivBase64 = btoa(String.fromCharCode(...iv));
  const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ivBase64}:${cipherBase64}`;
};

export const decryptMessage = async (aesKey, encryptedPayload) => {
  try {
    const [ivBase64, cipherBase64] = encryptedPayload.split(":");
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0));

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    // Return a distinguished placeholder for the UI
    return "🔐 [SECURITY_LOCKOUT: Click 'Regenerate' to restore access]";
  }
};

export const purgeChatCryptoData = async (chatId) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(SESSION_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SESSION_STORE_NAME);
    
    // Immediate removal of cached session keys
    const request = store.delete(chatId);
    
    request.onsuccess = () => {
      console.log(`[Zero-Trace] Session key purged from IndexedDB for chat: ${chatId}`);
    };

    localStorage.removeItem(`chat_key_${chatId}`);
    localStorage.removeItem(`chat_iv_${chatId}`);
    
    console.log(`[Zero-Trace] Legacy crypto tags purged for ${chatId}`);
  } catch (error) {
    console.error("Purge failed:", error);
  }
};

// --- VAULT & WRAPPING LOGIC (Zero-Knowledge Key Escrow) ---

/**
 * deriveVaultKey
 * Derives a 256-bit symmetric key from a password and salt using PBKDF2.
 */
export async function deriveVaultKey(password, salt) {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey", "encrypt", "decrypt"]
  );
}

/**
 * wrapPrivateKey
 * Wraps an RSA Private Key with a password-derived AES key.
 * Returns { encryptedKey: Base64, salt: string }
 */
export async function wrapPrivateKey(privateKey, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const saltStr = btoa(String.fromCharCode(...salt));
  
  const vaultKey = await deriveVaultKey(password, saltStr);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // We use wrapKey directly for the Private Key
  const wrappedArrayBuffer = await window.crypto.subtle.wrapKey(
    "pkcs8",
    privateKey,
    vaultKey,
    { name: "AES-GCM", iv }
  );

  // Combine IV + Wrapped Key for storage
  const combined = new Uint8Array(iv.length + wrappedArrayBuffer.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(wrappedArrayBuffer), iv.length);

  return {
    encryptedKey: btoa(String.fromCharCode(...combined)),
    salt: saltStr
  };
}

/**
 * unwrapPrivateKey
 * Decrypts a wrapped RSA Private Key using a password and salt.
 */
export async function unwrapPrivateKey(encryptedPayload, salt, password) {
  const vaultKey = await deriveVaultKey(password, salt);
  
  const combined = new Uint8Array(
    atob(encryptedPayload)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  const iv = combined.slice(0, 12);
  const wrappedKey = combined.slice(12);

  return window.crypto.subtle.unwrapKey(
    "pkcs8",
    wrappedKey,
    vaultKey,
    { name: "AES-GCM", iv },
    { name: "RSA-OAEP", hash: "SHA-256" },
    true, // extractable
    ["decrypt"]
  );
}
