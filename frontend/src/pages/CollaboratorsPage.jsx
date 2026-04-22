import { useEffect, useState } from "react";
import { UsersIcon, MessageSquareIcon, SearchIcon, PlusIcon, BellOffIcon, LogOutIcon, UserMinusIcon, PinIcon, PinOffIcon, Video } from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import { useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRecentChats, markChatAsRead, toggleMuteChat, leaveChat, removeFriend, togglePinChatNavbar, togglePinChatSidebar } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import { useLayoutStore } from "../store/useLayoutStore";
import { useUnreadStore } from "../store/useUnreadStore";
import SecureChat from "../components/SecureChat";
import ChatSnippet from "../components/ChatSnippet";
import { useContextMenu } from "../hooks/useContextMenu";
import ContextMenu from "../components/ContextMenu";
import CreateGroupModal from "../components/CreateGroupModal";
import toast from "react-hot-toast";

const CollaboratorsPage = () => {
  const { authUser } = useAuthUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatId = searchParams.get("chatId");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(chatId);
  const { onlineUserIds } = useLayoutStore();
  const activeChatCalls = useCallStore((state) => state.activeChatCalls);
  const { unreadCounts, setActiveChatId, clearCount, toggleMuteOptimistic, removeChatOptimistic } = useUnreadStore();
  const queryClient = useQueryClient();
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const { data: recentChats = [], isLoading } = useQuery({
    queryKey: ["recent-chats"],
    queryFn: getRecentChats
  });

  const sortedChats = [...recentChats].sort((a, b) => {
    if (a.isPinnedToSidebar && !b.isPinnedToSidebar) return -1;
    if (!a.isPinnedToSidebar && b.isPinnedToSidebar) return 1;

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

    if (unreadCounts[id]?.count > 0) {
      markChatAsRead(id).catch(console.error);
      clearCount(id);
    }
  };

  const handlePinToggle = async (chat) => {
    closeContextMenu();
    try {
      await togglePinChatNavbar(chat.id);
      queryClient.invalidateQueries(["recent-chats"]);
      toast.success(chat.isPinnedToNavbar ? "Unpinned from Navbar" : "Pinned to Navbar");
    } catch (error) {
      toast.error("Failed to update pin status");
    }
  };

  const handlePinSidebarToggle = async (chat) => {
    closeContextMenu();
    queryClient.setQueryData(["recent-chats"], (oldChats) =>
      oldChats?.map(c => c.id === chat.id ? { ...c, isPinnedToSidebar: !c.isPinnedToSidebar } : c)
    );

    try {
      await togglePinChatSidebar(chat.id);
      queryClient.invalidateQueries(["recent-chats"]);
      toast.success(chat.isPinnedToSidebar ? "Unpinned from Sidebar" : "Pinned to Top");
    } catch (error) {
      queryClient.invalidateQueries(["recent-chats"]);
      toast.error("Failed to update pin status");
    }
  };

  const handleMuteToggle = async (chatId) => {
    closeContextMenu();
    toggleMuteOptimistic(chatId);
    try {
      await toggleMuteChat(chatId);
    } catch (error) {
      toast.error("Failed to update mute status");
      toggleMuteOptimistic(chatId);
    }
  };

  const handleLeaveGroup = async (chatId) => {
    closeContextMenu();
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
      setSearchParams({});
      setActiveChatId(null);
    }
    try {
      await leaveChat(chatId);
      removeChatOptimistic(chatId);
      queryClient.invalidateQueries(["recent-chats"]);
      toast.success("Left group chat");
    } catch (error) {
      toast.error("Failed to leave group chat");
    }
  };

  const handleRemoveFriend = async (friendId, chatId) => {
    closeContextMenu();
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
      setSearchParams({});
      setActiveChatId(null);
    }
    try {
      await removeFriend(friendId);
      removeChatOptimistic(chatId);
      queryClient.invalidateQueries(["friends"]);
      queryClient.invalidateQueries(["recent-chats"]);
      queryClient.invalidateQueries(["users"]);
      toast.success("Friend removed successfully");
    } catch (error) {
      toast.error("Failed to remove friend");
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
            <div className="flex gap-2">
              <button
                onClick={() => setIsCreateGroupOpen(true)}
                className="btn btn-ghost btn-circle btn-sm"
                title="New Group"
              >
                <PlusIcon className="size-5" />
              </button>
            </div>
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
                .filter(chat => {
                  const matchName = chat.isGroup ? chat.name : chat.otherMember?.fullName;
                  const searchLower = searchTerm.toLowerCase();
                  return (
                    (matchName && matchName.toLowerCase().includes(searchLower)) ||
                    (chat.lastMessage?.content && chat.lastMessage.content.toLowerCase().includes(searchLower))
                  );
                })
                .map((chat) => {
                  const unreadData = unreadCounts[chat.id] || { count: 0, isMuted: false };
                  const unreadCount = typeof unreadData === "number" ? unreadData : unreadData.count;
                  const isMuted = unreadData.isMuted;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => handleChatSelect(chat.id)}
                      onContextMenu={(e) => handleContextMenu(e, chat)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative ${selectedChatId === chat.id
                        ? "bg-primary text-primary-content shadow-lg shadow-primary/20"
                        : "hover:bg-base-200"
                        }`}
                    >
                      <div className="relative">
                        <div className="avatar">
                          <div className="w-12 rounded-full ring-2 ring-base-100 bg-base-200 overflow-hidden">
                            {chat.isGroup ? (
                              chat.groupImage ? (
                                <img src={chat.groupImage} alt={chat.name} className="size-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                  <UsersIcon className="size-6 text-primary opacity-80" />
                                </div>
                              )
                            ) : (
                              <img
                                src={chat.otherMember?.profilePic || "/avatar-placeholder.png"}
                                alt={chat.otherMember?.fullName}
                                className="size-full object-cover"
                              />
                            )}
                          </div>
                        </div>
                        {/* Status indicator - derived from dynamic onlineUserIds */}
                        {!chat.isGroup && (
                          <div className={`absolute bottom-0 right-0 size-3 border-2 border-base-100 rounded-full transition-colors duration-300 ${onlineUserIds.includes(chat.otherMember?.id) ? "bg-success" : "bg-base-content/20"
                            }`} />
                        )}
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p className={`font-bold truncate flex items-center gap-1.5 ${selectedChatId === chat.id ? "" : "text-base-content"}`}>
                            {chat.isGroup ? chat.name : chat.otherMember?.fullName}
                            {chat.isPinnedToSidebar && (
                              <PinIcon className="size-3 text-accent fill-accent/20 rotate-45" />
                            )}
                            {isMuted && <BellOffIcon className="size-3 opacity-50" />}
                            {activeChatCalls.includes(chat.id) && (
                              <Video className="size-3.5 text-success animate-pulse shrink-0 fill-success/10" />
                            )}
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
                          <div className={`badge badge-sm animate-bounce ${isMuted ? 'badge-ghost' : 'badge-primary'}`}>
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
              targetUserId={activeChat.isGroup ? null : activeChat.otherMember?.id}
              targetUserName={activeChat.isGroup ? activeChat.name : activeChat.otherMember?.fullName}
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

      {contextMenu && contextMenu.data && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu}>
          <li>
            <button
              onClick={() => handlePinSidebarToggle(contextMenu.data)}
              className="flex items-center gap-2"
            >
              {contextMenu.data.isPinnedToSidebar ? <PinOffIcon className="size-4" /> : <PinIcon className="size-4" />}
              {contextMenu.data.isPinnedToSidebar ? "Unpin from Top" : "Pin to Top"}
            </button>
          </li>
          <li>
            <button
              onClick={() => handlePinToggle(contextMenu.data)}
              className="flex items-center gap-2"
            >
              {contextMenu.data.isPinnedToNavbar ? <PinOffIcon className="size-4" /> : <PinIcon className="size-4" />}
              {contextMenu.data.isPinnedToNavbar ? "Unpin from Navbar" : "Pin to Navbar"}
            </button>
          </li>
          <li>
            <button
              onClick={() => handleMuteToggle(contextMenu.data.id)}
              className="flex items-center gap-2"
            >
              <BellOffIcon className="size-4" />
              {(unreadCounts[contextMenu.data.id]?.isMuted) ? "Unmute Notifications" : "Mute Notifications"}
            </button>
          </li>

          {contextMenu.data.isGroup ? (
            <li>
              <button
                onClick={() => handleLeaveGroup(contextMenu.data.id)}
                className="flex items-center gap-2 text-error hover:bg-error/10 hover:text-error"
              >
                <LogOutIcon className="size-4" />
                Leave Group
              </button>
            </li>
          ) : (
            <li>
              <button
                onClick={() => {
                  const otherUserId = contextMenu.data.members?.find(m => m.id !== authUser.id)?.id;
                  handleRemoveFriend(otherUserId, contextMenu.data.id);
                }}
                className="flex items-center gap-2 text-error hover:bg-error/10 hover:text-error"
              >
                <UserMinusIcon className="size-4" />
                Remove Friend
              </button>
            </li>
          )}
        </ContextMenu>
      )}

      {isCreateGroupOpen && (
        <CreateGroupModal onClose={(newChatId) => {
          setIsCreateGroupOpen(false);
          if (newChatId) {
            handleChatSelect(newChatId);
          }
        }} />
      )}
    </div>
  );
};

export default CollaboratorsPage;
