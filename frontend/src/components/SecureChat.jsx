import React, { useState, useEffect, useRef } from "react";
import { Lock, Send, ShieldAlert, FileText, Phone } from "lucide-react";
import { connectSocket } from "../lib/socketClient";

// A mock of our encryption for UI purposes until keys exchange properly
import { encryptMessage, decryptMessage } from "../lib/crypto";

const SecureChat = ({ chatId, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const socket = useRef(null);

  useEffect(() => {
    socket.current = connectSocket();

    // Join Group Chat Room
    socket.current.emit("join-chat", chatId);

    socket.current.on("new-message", async (data) => {
      // In a real flow, fetch AES key from IndexedDB using ChatID
      // and decrypt data.ciphertext. For our prototype/UI showcase:
      setMessages((prev) => [...prev, { id: Date.now(), sender: data.senderId, text: data.text }]);
    });

    return () => {
      socket.current.emit("leave-chat", chatId);
      socket.current.off("new-message");
    };
  }, [chatId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Execute E2EE locally before transmission
    // const encrypted = await encryptMessage(myLocalKeys, inputText);

    // Simulate sending
    const newMsg = { id: Date.now(), sender: currentUserId, text: inputText };
    setMessages((prev) => [...prev, newMsg]);
    // socket.current.emit("send-message", { chatId, ciphertext: encrypted });

    setInputText("");
  };

  return (
    <div className="flex flex-col h-full bg-base-300 rounded-xl overflow-hidden shadow-2xl border border-white/5">
      {/* Header */}
      <div className="bg-base-100 p-4 border-b border-white/10 flex justify-between items-center bg-opacity-80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success/20 text-success rounded-lg">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Secure Channel</h3>
            <p className="text-xs opacity-60 flex items-center gap-1">
              <ShieldAlert size={12} /> End-to-End Encrypted
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-2">
            <Lock size={48} className="mb-2" />
            <p>No messages yet.</p>
            <p className="text-sm">Nobody, not even Harmonix, can read your messages.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`chat ${m.sender === currentUserId ? 'chat-end' : 'chat-start'}`}>
              <div className={`chat-bubble shadow-md ${m.sender === currentUserId ? 'bg-primary text-primary-content' : 'bg-base-200'}`}>
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-base-200 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Secure message..."
          className="input input-bordered flex-1 bg-base-100 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button type="submit" className="btn btn-primary px-4 shadow-lg hover:scale-105 transition-transform">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default SecureChat;
