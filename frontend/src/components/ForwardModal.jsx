import React, { useState, useEffect } from "react";
import { X, Search, Send, Lock } from "lucide-react";
import { getRecentChats } from "../lib/api";

const ForwardModal = ({ isOpen, onClose, onForward, originalMessage }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadChats();
    }
  }, [isOpen]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const data = await getRecentChats();
      // Only forward to permanent chats for now, or all chats?
      // Spec says "active permanent chats/collaborators"
      const permanentChats = data.filter(c => c.chatType === "PERMANENT");
      setChats(permanentChats);
    } catch (error) {
      console.error("Failed to load chats for forwarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const name = chat.isGroup ? chat.title : chat.otherMember?.fullName;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Send className="text-blue-400 w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">Forward Message</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search chats..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="max-h-[350px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading ? (
            <div className="py-8 text-center text-white/40 text-sm">Loading chats...</div>
          ) : filteredChats.length > 0 ? (
            filteredChats.map(chat => {
              const name = chat.isGroup ? chat.title : chat.otherMember?.fullName;
              const avatar = chat.isGroup ? null : chat.otherMember?.profilePic;
              
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedChatId === chat.id 
                      ? "bg-blue-500/20 border-blue-500/30" 
                      : "hover:bg-white/5 border-transparent"
                  } border`}
                >
                  <div className="avatar flex-shrink-0">
                    <div className="w-10 rounded-full bg-white/10">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-white/40">
                          {name?.[0]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-white truncate">{name}</div>
                    <div className="text-xs text-white/30 truncate flex items-center gap-1">
                      <Lock size={10} /> End-to-end encrypted
                    </div>
                  </div>
                  {selectedChatId === chat.id && (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="py-12 text-center text-white/30 text-sm">
              No chats found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            disabled={!selectedChatId}
            onClick={() => onForward(selectedChatId)}
            className="flex-2 py-2 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium text-white flex items-center justify-center gap-2"
          >
            <Send size={16} />
            Forward Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
