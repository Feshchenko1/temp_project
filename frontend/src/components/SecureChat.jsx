import React, { useState, useEffect, useRef } from "react";
import { Lock, Send, ShieldAlert, Video, Paperclip, LoaderIcon, Smile } from "lucide-react";
import { connectSocket } from "../lib/socketClient";
import { uploadFileDirectly } from "../lib/api";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

// Components
import MessageAttachment from "./MessageAttachment";
import VideoCallOverlay from "./VideoCallOverlay";

// A mock of our encryption for UI purposes until keys exchange properly
import { encryptMessage, decryptMessage } from "../lib/crypto";

const SecureChat = ({ chatId, currentUserId, targetUserId, targetUserName }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    socket.current = connectSocket();

    // Join Group Chat Room
    socket.current.emit("join-chat", chatId);

    socket.current.on("receive_message", (data) => {
      setMessages((prev) => [...prev, { 
        id: Date.now(), 
        sender: data.senderId, 
        text: data.text,
        fileUrl: data.fileUrl,
        fileName: data.fileName
      }]);
    });

    return () => {
      socket.current.emit("leave-chat", chatId);
      socket.current.off("receive_message");
    };
  }, [chatId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingFile) return;

    let attachmentUrl = "";
    let originalName = "";
    if (pendingFile) {
      setIsUploading(true);
      try {
        const result = await uploadFileDirectly(pendingFile);
        attachmentUrl = result.fileUrl;
        originalName = result.originalName;
        toast.success("File uploaded to Studio storage.");
      } catch (err) {
        toast.error("Cloud storage failed. Bypass aborted.");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
      setPendingFile(null);
    }

    const messagePayload = {
      chatId,
      text: inputText.trim(),
      fileUrl: attachmentUrl,
      fileName: originalName
    };

    const newMsg = { 
      id: Date.now(), 
      sender: currentUserId, 
      text: messagePayload.text,
      fileUrl: messagePayload.fileUrl,
      fileName: messagePayload.fileName
    };
    
    setMessages((prev) => [...prev, newMsg]);
    socket.current.emit("send_message", messagePayload);

    setInputText("");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const TWO_GB = 2 * 1024 * 1024 * 1024;
    if (file.size > TWO_GB) {
      toast.error("Hardware limit reach (2GB). Use local recording.");
      return;
    }

    setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = null; // reset
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle clicking outside emoji picker to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onEmojiClick = (emojiData) => {
    setInputText((prev) => prev + emojiData.emoji);
  };

  const [pendingFile, setPendingFile] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const handleAcceptCall = () => {
    socket.current.emit("call:response", { 
      targetUserId: incomingCall.fromUserId, 
      accepted: true, 
      chatId: incomingCall.chatId 
    });
    setIsInitiator(false);
    setIsInCall(true);
    setIncomingCall(null);
  };

  // Global Room Listeners (Always Mounted while in room)
  useEffect(() => {
    if (!socket.current) return;

    const handleInvite = (data) => setIncomingCall(data);
    const handleResponse = (data) => {
      if (!data.accepted) {
        toast.error("Call declined or unavailable.");
        setIsInCall(false);
      }
    };

    socket.current.on("call:incoming", handleInvite);
    socket.current.on("call:response", handleResponse);

    return () => {
      socket.current?.off("call:incoming", handleInvite);
      socket.current?.off("call:response", handleResponse);
    };
  }, [socket.current]);

  const handleDeclineCall = () => {
    socket.current.emit("call:response", { 
      targetUserId: incomingCall.fromUserId, 
      accepted: false, 
      chatId: incomingCall.chatId 
    });
    setIncomingCall(null);
  };

  const renderMessageContent = (m) => {
    return (
      <div className="flex flex-col gap-2">
        {m.text && <span className="whitespace-pre-wrap">{m.text}</span>}
        {m.fileUrl && <MessageAttachment url={m.fileUrl} originalName={m.fileName} />}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-base-300 rounded-xl overflow-hidden shadow-2xl border border-white/5">
      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-base-100 p-8 rounded-3xl shadow-2xl border border-white/10 flex flex-col items-center max-w-sm w-full mx-4">
            <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6 animate-bounce">
              <Video size={40} />
            </div>
            <h3 className="text-2xl font-bold mb-2">Incoming Call</h3>
            <p className="text-base-content/60 mb-8 text-center">Studio collaboration requested</p>
            <div className="flex gap-4 w-full">
              <button onClick={handleDeclineCall} className="btn btn-error flex-1 rounded-2xl">Decline</button>
              <button onClick={handleAcceptCall} className="btn btn-success flex-1 rounded-2xl">Accept</button>
            </div>
          </div>
        </div>
      )}

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
        <button 
          onClick={() => {
            // Signal call to target
            socket.current.emit("call:initiate", { 
              targetUserId, 
              chatId,
              callerName: "Studio Peer"
            });
            setIsInitiator(true);
            setIsInCall(true);
          }}
          className="btn btn-circle btn-ghost text-primary hover:bg-primary/10"
          title="Start Collaboration Call"
        >
          <Video size={20} />
        </button>
      </div>

      {isInCall && (
        <VideoCallOverlay 
          chatId={chatId} 
          currentUserId={currentUserId} 
          targetUserId={targetUserId}
          isInitiator={isInitiator}
          onEndCall={() => setIsInCall(false)}
          onAddMessage={(msg) => setMessages(prev => [...prev, msg])}
        />
      )}

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
                {renderMessageContent(m)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-base-200 border-t border-white/5 flex flex-col gap-2 relative">
        {pendingFile && (
          <div className="flex items-center gap-3 bg-base-100 p-2 rounded-xl border border-primary/20 animate-in slide-in-from-bottom-2">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Paperclip size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{pendingFile.name}</p>
              <p className="text-xs opacity-50">{(pendingFile.size / 1e6).toFixed(2)} MB</p>
            </div>
            <button 
              type="button" 
              onClick={() => setPendingFile(null)}
              className="btn btn-circle btn-xs btn-ghost hover:bg-error/20 hover:text-error"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          
          <div className="flex items-center">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              className="btn btn-circle btn-ghost text-base-content/60 hover:text-primary hover:bg-primary/10"
              disabled={isUploading || !!pendingFile}
            >
              <Paperclip size={20} />
            </button>

            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`btn btn-circle btn-ghost ${showEmojiPicker ? 'text-primary bg-primary/10' : 'text-base-content/60'} hover:text-primary hover:bg-primary/10`}
            >
              <Smile size={20} />
            </button>
          </div>

          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full left-4 mb-4 z-50">
              <EmojiPicker 
                theme="dark"
                onEmojiClick={onEmojiClick}
                autoFocusSearch={false}
                skinTonesDisabled
                searchDisabled={false}
                width={320}
                height={400}
              />
            </div>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isUploading ? "Uploading to Cloud..." : "Secure message..."}
            className="input input-bordered flex-1 bg-base-100 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            disabled={isUploading}
          />
          <button type="submit" disabled={(isUploading) || (!inputText.trim() && !pendingFile)} className="btn btn-primary px-4 shadow-xl hover:-translate-y-0.5 transition-all">
            {isUploading ? <LoaderIcon className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SecureChat;
