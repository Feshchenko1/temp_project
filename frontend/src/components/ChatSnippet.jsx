import { useState, useEffect } from "react";
import { getGroupKeys } from "../lib/api";

import { 
  decryptSymmetricKey,
  getPrivateKey,
  decryptMessage 
} from "../lib/crypto";

const ChatSnippet = ({ message, chatId, currentUserId, isBold }) => {
  const [decryptedText, setDecryptedText] = useState(null);
  const [status, setStatus] = useState("loading"); // loading, success, error, file

  useEffect(() => {
    if (!message) {
      setStatus("success");
      setDecryptedText("Start a conversation...");
      return;
    }

    if (!message.content && message.fileUrl) {
      setDecryptedText(`📎 ${message.originalName || "File"}`);
      setStatus("file");
      return;
    }

    const resolveAndDecrypt = async () => {
      try {
        // 1. Try to get key from local storage/session cache if possible (future optimization)
        // For now, follow requirements: fetch and decrypt
        
        const serverKeys = await getGroupKeys(chatId);
        const myKeyEntry = serverKeys.find(k => k.recipientId === currentUserId);
        
        if (!myKeyEntry) {
          throw new Error("No key for snippet");
        }

        const privKey = await getPrivateKey(currentUserId);
        if (!privKey) throw new Error("No private key");

        const aesKey = await decryptSymmetricKey(privKey, myKeyEntry.encryptedAesKey);
        const decrypted = await decryptMessage(aesKey, message.content);
        
        setDecryptedText(decrypted);
        setStatus("success");
      } catch (err) {
        // Silence expected E2EE decryption failures (e.g. after key rotation)
        // console.warn("Snippet decryption failed:", err); 
        setStatus("error");
      }
    };

    resolveAndDecrypt();
  }, [message, chatId, currentUserId]);

  if (status === "loading") {
    return <span className="opacity-30">...</span>;
  }

  if (status === "error") {
    return <span className="opacity-50 italic">🔒 Encrypted Message</span>;
  }

  if (status === "file") {
     return <span className={`text-primary italic font-medium ${isBold ? "font-bold text-base-content" : ""}`}>{decryptedText}</span>;
  }

  return <span className={isBold ? "font-bold text-base-content" : ""}>{decryptedText}</span>;
};

export default ChatSnippet;
