const DB_NAME = "HarmonixCryptoDB";
const STORE_NAME = "privateKeys";
const SESSION_STORE_NAME = "sessionKeys";

const openDB = () => {
  return new Promise((resolve, reject) => {
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
        await removePrivateKey(userId);
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveSessionKey = async (chatId, aesKey) => {
  const db = await openDB();
  const jwk = await window.crypto.subtle.exportKey("jwk", aesKey);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SESSION_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SESSION_STORE_NAME);
    const request = store.put(jwk, chatId);
    request.onsuccess = () => {
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
        const delTx = db.transaction(SESSION_STORE_NAME, "readwrite");
        delTx.objectStore(SESSION_STORE_NAME).delete(chatId);
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearCryptoDatabase = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };

    request.onblocked = () => {
      resolve();
    };
  });
};

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
    throw error;
  }
};

export const generateAndStoreRSAKeys = async (userId) => {
  const pair = await generateKeyPair();
  await savePrivateKey(userId, pair.privateKey);
  const pubKeyString = await exportPublicKey(pair.publicKey);
  return pubKeyString;
};

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
    throw err;
  }
};

export const rotateSessionKey = async (members) => {
  const newAesKey = await generateSymmetricKey();
  const encryptedKeys = await Promise.all(
    members.map(async (member) => {
      if (!member.publicKey) {
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
        return null;
      }
    })
  );

  const validKeys = encryptedKeys.filter(k => k !== null);
  
  return { newAesKey, encryptedKeys: validKeys };
};

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
    return "🔐 [SECURITY_LOCKOUT: Click 'Regenerate' to restore access]";
  }
};

export const purgeChatCryptoData = async (chatId) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(SESSION_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SESSION_STORE_NAME);
    
    const request = store.delete(chatId);
    
    request.onsuccess = () => {
    };

    localStorage.removeItem(`chat_key_${chatId}`);
    localStorage.removeItem(`chat_iv_${chatId}`);
    
  } catch (error) {
  }
};

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

export function generateRecoveryKey() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomValues = new Uint8Array(16);
  window.crypto.getRandomValues(randomValues);

  let key = '';
  for (let i = 0; i < 16; i++) {
    key += charset[randomValues[i] % charset.length];
    if ((i + 1) % 4 === 0 && i !== 15) {
      key += '-';
    }
  }
  return key;
}

export async function wrapPrivateKey(privateKey, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const saltStr = btoa(String.fromCharCode(...salt));
  
  const vaultKey = await deriveVaultKey(password, saltStr);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const wrappedArrayBuffer = await window.crypto.subtle.wrapKey(
    "pkcs8",
    privateKey,
    vaultKey,
    { name: "AES-GCM", iv }
  );

  const combined = new Uint8Array(iv.length + wrappedArrayBuffer.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(wrappedArrayBuffer), iv.length);

  return {
    encryptedKey: btoa(String.fromCharCode(...combined)),
    salt: saltStr
  };
}

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
    true, 
    ["decrypt"]
  );
}
