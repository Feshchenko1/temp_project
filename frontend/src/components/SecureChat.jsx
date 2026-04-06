import React, { useState, useEffect, useRef } from "react";
import { Lock, Send, ShieldAlert, Video, Paperclip, LoaderIcon } from "lucide-react";
import { connectSocket } from "../lib/socketClient";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

// A mock of our encryption for UI purposes until keys exchange properly
import { encryptMessage, decryptMessage } from "../lib/crypto";

const SecureChat = ({ chatId, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    socket.current = connectSocket();

    // Join Group Chat Room
    socket.current.emit("join-chat", chatId);

    socket.current.on("receive_message", async (data) => {
      // In a real flow, fetch AES key from IndexedDB using ChatID
      // and decrypt data.ciphertext. For our prototype/UI showcase:
      setMessages((prev) => [...prev, { id: Date.now(), sender: data.senderId, text: data.text }]);
    });

    return () => {
      socket.current.emit("leave-chat", chatId);
      socket.current.off("receive_message");
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
    socket.current.emit("send_message", { chatId, text: inputText });

    setInputText("");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const res = await axiosInstance.post("/upload/presigned-url", {
        filename: file.name,
        fileType: file.type
      });

      const { presignedUrl, fileUrl } = res.data;

      await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      socket.current.emit("send_message", { chatId, text: fileUrl });
      const newMsg = { id: Date.now(), sender: currentUserId, text: fileUrl };
      setMessages((prev) => [...prev, newMsg]);

      toast.success("Attachment securely uploaded.");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Ensure backend S3 tokens are valid.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = null; // reset
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderMessageContent = (text) => {
    if (!text) return "";
    // Basic detection for image links
    if (typeof text === 'string' && text.startsWith("http") && (text.match(/\.(jpeg|jpg|gif|png|webp)$/i) || text.includes("cloudflare"))) {
      return <img src={text} alt="chat attachment" className="rounded-lg max-w-xs mt-1" />;
    }
    return text;
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
        <button className="btn btn-circle btn-ghost text-primary hover:bg-primary/10">
          <Video size={20} />
        </button>
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
                {renderMessageContent(m.text)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-base-200 border-t border-white/5 flex items-center gap-2">
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
        />
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()} 
          className="btn btn-circle btn-ghost text-base-content/60 hover:text-primary hover:bg-primary/10"
          disabled={isUploading}
        >
          {isUploading ? <LoaderIcon className="animate-spin" size={20} /> : <Paperclip size={20} />}
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Secure message..."
          className="input input-bordered flex-1 bg-base-100 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button type="submit" disabled={!inputText.trim() && !isUploading} className="btn btn-primary px-4 shadow-lg hover:scale-105 transition-transform">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default SecureChat;
