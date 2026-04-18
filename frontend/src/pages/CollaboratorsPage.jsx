import { useEffect, useState } from "react";
import { UsersIcon, MessageSquareIcon, SearchIcon, FilterIcon } from "lucide-react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getRecentChats, markChatAsRead } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import { useLayoutStore } from "../store/useLayoutStore";
import { useUnreadStore } from "../store/useUnreadStore";
import SecureChat from "../components/SecureChat";
import ChatSnippet from "../components/ChatSnippet";

const CollaboratorsPage = () => {
  const { authUser } = useAuthUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatId = searchParams.get("chatId");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(chatId);
  const { onlineUserIds } = useLayoutStore();
  const { unreadCounts, setActiveChatId, clearCount } = useUnreadStore();

  const { data: recentChats = [], isLoading } = useQuery({
    queryKey: ["recent-chats"],
    queryFn: getRecentChats
  });

  const sortedChats = [...recentChats].sort((a, b) => {
    const dateA = new Date(a.lastMessage?.createdAt || a.updatedAt);
    const dateB = new Date(b.lastMessage?.createdAt || b.updatedAt);
    return dateB - dateA;
  });

  const activeChat = recentChats.find(chat => chat.id === selectedChatId);

  useEffect(() => {
    if (chatId) {
      setSelectedChatId(chatId);
      setActiveChatId(chatId);
      if (unreadCounts[chatId] > 0) {
        markChatAsRead(chatId).catch(console.error);
        clearCount(chatId);
      }
    } else {
      setActiveChatId(null);
    }
  }, [chatId, setActiveChatId, clearCount, markChatAsRead, unreadCounts]);


  const handleChatSelect = (id) => {
    setSelectedChatId(id);
    setSearchParams({ chatId: id });
    setActiveChatId(id);

    if (unreadCounts[id] > 0) {
      markChatAsRead(id).catch(console.error);
      clearCount(id);
    }
  };

  return (
    <div className="flex bg-base-300/30 h-[calc(100vh-64px)] overflow-hidden">
      {/* CHATS LIST - LEFT SIDE */}
      <div className="w-80 border-r border-base-300 flex flex-col bg-base-100/50 backdrop-blur-md">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <UsersIcon className="size-5 text-primary" />
              Collaborators
            </h1>
            <button className="btn btn-ghost btn-sm btn-circle">
              <FilterIcon className="size-4" />
            </button>
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
            <input
              type="text"
              placeholder="Search chats..."
              className="input input-bordered w-full pl-10 bg-base-200/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-md opacity-30" />
            </div>
          ) : recentChats.length === 0 ? (
            <div className="p-8 text-center space-y-4 opacity-50 mt-10">
              <div className="bg-base-200 size-16 rounded-2xl flex items-center justify-center mx-auto">
                <MessageSquareIcon className="size-8" />
              </div>
              <p className="text-sm font-medium">No active connections</p>
              <button className="btn btn-primary btn-sm btn-outline">Find Creators</button>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {sortedChats
                .filter(chat =>
                  chat.otherMember && (
                    chat.otherMember.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    chat.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                )
                .map((chat) => {
                  const unreadCount = unreadCounts[chat.id] || 0;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => handleChatSelect(chat.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative ${selectedChatId === chat.id
                          ? "bg-primary text-primary-content shadow-lg shadow-primary/20"
                          : "hover:bg-base-200"
                        }`}
                    >
                      <div className="relative">
                        <div className="avatar">
                          <div className="w-12 rounded-full ring-2 ring-base-100">
                            <img
                              src={chat.otherMember?.profilePic || "/avatar-placeholder.png"}
                              alt={chat.otherMember?.fullName}
                            />
                          </div>
                        </div>
                        {/* Status indicator - derived from dynamic onlineUserIds */}
                        <div className={`absolute bottom-0 right-0 size-3 border-2 border-base-100 rounded-full transition-colors duration-300 ${onlineUserIds.includes(chat.otherMember?.id) ? "bg-success" : "bg-base-content/20"
                          }`} />
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p className={`font-bold truncate ${selectedChatId === chat.id ? "" : "text-base-content"}`}>
                            {chat.otherMember?.fullName}
                          </p>
                          {chat.lastMessage && (
                            <span className={`text-[10px] ${selectedChatId === chat.id ? "opacity-70" : "opacity-40"}`}>
                              {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate ${selectedChatId === chat.id ? "opacity-80" : "opacity-50"}`}>
                          <ChatSnippet
                            message={chat.lastMessage}
                            chatId={chat.id}
                            currentUserId={authUser?.id}
                            isBold={unreadCount > 0}
                          />
                        </p>
                      </div>

                      {unreadCount > 0 && (
                        <div className="flex flex-col items-end gap-1">
                          <div className="badge badge-primary badge-sm animate-bounce">
                            {unreadCount}
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
            </div>
          )}
        </div>
      </div>


      {/* ACTIVE AREA - RIGHT SIDE */}
      <div className="flex-1 flex flex-col bg-base-200/30 overflow-hidden relative">
        {selectedChatId && activeChat ? (
          <div className="h-full p-4">
            <SecureChat
              chatId={selectedChatId}
              currentUserId={authUser?.id}
              targetUserId={activeChat.otherMember?.id}
              targetUserName={activeChat.otherMember?.fullName}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center">
            <div className="max-w-md space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="bg-primary/10 size-24 rounded-full flex items-center justify-center animate-pulse">
                    <UsersIcon className="size-12 text-primary" />
                  </div>
                </div>
              </div>
              <h2 className="text-3xl font-black">Your Creative Network</h2>
              <p className="text-base-content/70 leading-relaxed font-medium">
                Select a collaborator from the sidebar to start a real-time session,
                signal WebRTC calls, or share encrypted notes.
              </p>
              <div className="flex gap-3 justify-center">
                <div className="badge badge-outline badge-primary p-3 font-semibold">TDD Active</div>
                <div className="badge badge-outline badge-accent p-3 font-semibold">E2EE Ready</div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default CollaboratorsPage;
