import { Link, useLocation } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useAuthUser from "../hooks/useAuthUser";
import { acceptFriendRequest, rejectFriendRequest, getRecentChats } from "../lib/api";
import { useProfileStore } from "../store/useProfileStore";
import { Check, HeadphonesIcon, PanelLeftIcon, Play, Pause, X, Volume2, VolumeX, UsersIcon, SkipBack, SkipForward, Camera, Search, Plus, Bell, ShieldCheck, FileMusic, MessageSquare, Music } from "lucide-react";
import toast from "react-hot-toast";
import CommandPalette from "./CommandPalette";
import { useLayoutStore } from "../store/useLayoutStore";
import { useAudioStore } from "../store/useAudioStore";
import { useUnreadStore } from "../store/useUnreadStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { useModalStore } from "../store/useModalStore";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const { isSidebarCollapsed, toggleSidebar, onlineUserIds } = useLayoutStore();
  const { currentTrack, isPlaying, volume, setVolume, togglePlayPause, stopTrack, playNext, playPrev } = useAudioStore();
  const { unreadCounts } = useUnreadStore();
  const { pendingRequests, removeRequest } = useNotificationStore();
  const { openUploadTrackModal, openScoreFormModal, openCreateGroupModal } = useModalStore();

  const queryClient = useQueryClient();
  const openProfile = useProfileStore((state) => state.openProfile);

  const handleAcceptRequest = async (e, reqId) => {
    e.stopPropagation();
    e.preventDefault();

    removeRequest(reqId);

    queryClient.setQueryData(["friend-requests"], (old) => {
      if (!old) return old;
      return {
        ...old,
        incomingReqs: (old.incomingReqs || []).filter(req => req.id !== reqId)
      };
    });

    try {
      await acceptFriendRequest(reqId);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      toast.success("Request accepted!");
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      toast.error("Failed to accept");
    }
  };

  const handleRejectRequest = async (e, reqId) => {
    e.stopPropagation();
    e.preventDefault();

    removeRequest(reqId);

    queryClient.setQueryData(["friend-requests"], (old) => {
      if (!old) return old;
      return {
        ...old,
        incomingReqs: (old.incomingReqs || []).filter(req => req.id !== reqId)
      };
    });

    try {
      await rejectFriendRequest(reqId);
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      toast.success("Request rejected");
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      toast.error("Failed to reject");
    }
  };

  const { data: recentChats = [] } = useQuery({
    queryKey: ["recent-chats"],
    queryFn: getRecentChats
  });

  const pinnedChats = recentChats.filter(chat => chat.isPinnedToNavbar);

  return (
    <nav className="bg-base-200/80 backdrop-blur-md border-b border-base-300 sticky top-0 z-50 h-16 flex items-center shadow-sm">
      <div className="container mx-auto px-4 w-full">
        <div className="flex items-center justify-between gap-2 h-full">

          {/* LEFT SECTION: TOGGLE & CHATS */}
          <div className="flex items-center gap-1 min-w-0 flex-[1_1_0%]">
            {authUser && (
              <button
                onClick={toggleSidebar}
                className="btn btn-ghost btn-sm btn-square lg:flex hidden hover:bg-base-300 transition-colors shrink-0"
              >
                <PanelLeftIcon className="size-5" />
              </button>
            )}

            <div className="w-px h-8 bg-base-300 mx-2 hidden lg:block shrink-0"></div>

            <div
              className="flex items-center gap-4 overflow-x-auto overflow-y-hidden h-12 px-4 w-full
               [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
               [mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]"
            >
              {pinnedChats.map((chat) => {
                const isGroup = chat.isGroup;
                const name = isGroup ? chat.name : chat.otherMember?.fullName;
                const pic = isGroup ? chat.groupImage : chat.otherMember?.profilePic;
                const unreadData = unreadCounts[chat.id] || { count: 0 };
                const unreadCount = typeof unreadData === "number" ? unreadData : unreadData.count;
                const isOnline = !isGroup && onlineUserIds.includes(chat.otherMember?.id);

                return (
                  <Link
                    key={chat.id}
                    to={`/collaborators?chatId=${chat.id}`}
                    title={name}
                    className="relative transition-transform duration-300 hover:scale-125 active:scale-95 shrink-0 z-10"
                  >
                    <div className="avatar">
                      <div className="w-9 h-9 rounded-full ring-2 ring-transparent hover:ring-primary/50 transition-all overflow-hidden bg-base-200 border border-base-300 shadow-sm">
                        {pic ? (
                          <img src={pic} alt={name} className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full w-full bg-base-300 text-base-content/40">
                            <UsersIcon className="size-4" />
                          </div>
                        )}
                      </div>
                    </div>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 size-2.5 bg-success border-2 border-base-100 rounded-full"></div>
                    )}
                    {chat.isCallActive && (
                      <div className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center bg-success rounded-full border-2 border-base-100 shadow-sm animate-pulse z-20">
                        <Camera className="size-2 text-white fill-white/20" />
                      </div>
                    )}
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 badge badge-primary badge-xs scale-75 border-base-100 shadow-sm z-20">
                        {unreadCount}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* CENTER SECTION: PLAYER */}
          {isSidebarCollapsed && currentTrack && (
            <div className="flex items-center justify-center shrink-0 z-30 min-w-[400px]">
              <div className="flex items-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-px h-10 bg-base-300 mx-2 hidden xl:block opacity-50 shrink-0"></div>

                <div className="flex items-center gap-4 bg-base-100/60 backdrop-blur-md border border-base-300 rounded-full pl-1 pr-4 py-1.5 shadow-2xl hover:border-primary/30 transition-all w-full max-w-[360px] sm:max-w-md group overflow-hidden pointer-events-auto">
                  <div className="size-9 rounded-full bg-primary/10 shrink-0 overflow-hidden border border-primary/5 shadow-inner">
                    {currentTrack.user?.profilePic ? (
                      <img src={currentTrack.user.profilePic} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary"><HeadphonesIcon size={16} /></div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[11px] font-black leading-tight truncate group-hover:text-primary transition-colors">
                        {currentTrack.title}
                      </span>
                      <span className="text-[9px] font-bold opacity-40 uppercase truncate tracking-tighter">
                        {currentTrack.artist || "Harmonix"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={playPrev} className="text-base-content/40 hover:text-primary transition-colors p-1">
                        <SkipBack size={14} />
                      </button>

                      <button onClick={togglePlayPause} className="btn btn-primary btn-xs btn-circle shrink-0 shadow-md hover:scale-110">
                        {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                      </button>

                      <button onClick={playNext} className="text-base-content/40 hover:text-primary transition-colors p-1">
                        <SkipForward size={14} />
                      </button>
                    </div>

                    {/* CUSTOM VOLUME SLIDER */}
                    <div className="flex items-center gap-3 hidden sm:flex group/vol px-2">
                      <button
                        onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
                        className="text-base-content/30 hover:text-primary transition-all duration-300"
                      >
                        {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>

                      <div className="relative w-16 sm:w-20 h-6 flex items-center group/slider">
                        <div className="absolute w-full h-1 bg-base-300 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-100"
                            style={{ width: `${volume * 100}%` }}
                          ></div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div
                          className="absolute size-3 bg-white rounded-full border-2 border-primary shadow-md pointer-events-none transition-transform group-hover/slider:scale-125"
                          style={{ left: `calc(${volume * 100}% - 6px)` }}
                        ></div>
                      </div>
                    </div>

                    <div className="w-px h-5 bg-base-300/50"></div>

                    <button onClick={stopTrack} className="text-base-content/20 hover:text-error transition-colors p-1">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="w-px h-10 bg-base-300 mx-2 hidden xl:block opacity-50 shrink-0"></div>
              </div>
            </div>
          )}

          {/* DIVIDER */}
          <div className="w-px h-8 bg-base-300 mx-2 hidden lg:block shrink-0"></div>

          {/* RIGHT SECTION: UNIFIED POWER TOPBAR */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <CommandPalette />

            {/* 1. Command Palette Trigger */}
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'k', 'ctrlKey': true }))}
              className="hidden md:flex items-center gap-3 bg-base-200/50 hover:bg-base-300/50 px-4 py-2 rounded-xl text-sm text-base-content/60 transition-colors border border-base-300/50"
            >
              <Search size={16} />
              <span>Search Harmonix...</span>
              <div className="flex gap-1 ml-4">
                <kbd className="kbd kbd-xs bg-base-300">Ctrl</kbd>
                <kbd className="kbd kbd-xs bg-base-300">K</kbd>
              </div>
            </button>

            <div className="w-[1px] h-6 bg-base-300 mx-1 hidden sm:block"></div>

            {/* 2. Quick Action Hub */}
            <div className="dropdown dropdown-end">
              <button className="btn btn-primary btn-sm btn-circle shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <Plus size={18} />
              </button>
              <ul className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-100 rounded-box w-52 mt-4 border border-base-300">
                <li className="menu-title text-[10px] tracking-wider uppercase opacity-50 px-4 py-2">Create New</li>
                <li><button onClick={() => openUploadTrackModal()}><Music size={16} /> Audio Track</button></li>
                <li><button onClick={() => openScoreFormModal()}><FileMusic size={16} /> Music Score</button></li>
                <li><button onClick={() => openCreateGroupModal()}><MessageSquare size={16} /> Chat Group</button></li>
              </ul>
            </div>

            {/* 3. Notifications */}
            <div className="dropdown dropdown-end">
              <button className="btn btn-ghost btn-sm btn-circle hover:bg-base-200 transition-colors relative">
                <Bell size={18} />
                {pendingRequests.length > 0 && (
                  <span className="absolute top-0 right-0 size-2 bg-error rounded-full animate-pulse border border-base-100"></span>
                )}
              </button>
              <ul className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-100 rounded-box w-80 mt-4 border border-base-300">
                <li className="menu-title px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-base-content/50">
                  Notifications
                </li>

                {pendingRequests && pendingRequests.length > 0 ? (
                  <>
                    {pendingRequests.slice(0, 3).map((req) => (
                      <li key={req.id} className="mb-1">
                        <div
                          className="flex items-center gap-3 p-2 hover:bg-base-200 cursor-pointer rounded-xl"
                          onMouseDown={(e) => {
                            if (e.target.closest('button')) return;

                            e.preventDefault();

                            if (req.sender) {
                              openProfile(req.sender);
                            }
                            if (document.activeElement) {
                              document.activeElement.blur();
                            }
                          }}
                        >
                          <div className="avatar">
                            <div className="w-10 rounded-full">
                              <img src={req.sender.profilePic || "/avatar.png"} alt="avatar" />
                            </div>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-sm truncate">{req.sender.fullName}</p>
                            <p className="text-xs text-base-content/60 truncate">Sent a friend request</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => handleAcceptRequest(e, req.id)}
                              className="btn btn-circle btn-xs btn-success text-success-content"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={(e) => handleRejectRequest(e, req.id)}
                              className="btn btn-circle btn-xs btn-ghost border border-base-300 hover:bg-error hover:text-error-content"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                    <div className="divider my-1"></div>
                    <li>
                      <Link
                        to="/notifications"
                        onClick={() => document.activeElement?.blur()}
                        className="text-center text-xs font-bold py-3 text-primary hover:bg-primary/10 transition-colors block w-full"
                      >
                        VIEW ALL REQUESTS
                      </Link>
                    </li>
                  </>
                ) : (
                  <div className="text-center py-6 px-4">
                    <p className="text-sm font-medium text-base-content/70">You're all caught up!</p>
                    <p className="text-xs text-base-content/40 mt-1">No new notifications.</p>
                  </div>
                )}
              </ul>
            </div>

            {/* 4. E2EE Status */}
            <div className="relative flex items-center group cursor-default">
              <div className="btn btn-ghost btn-sm btn-circle text-success hover:bg-success/10">
                <ShieldCheck size={18} />
              </div>
              {/* Custom Right-Aligned Tooltip */}
              <div className="absolute top-full right-0 mt-1 px-3 py-1.5 bg-success text-success-content text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] shadow-xl">
                E2EE Secured
              </div>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;