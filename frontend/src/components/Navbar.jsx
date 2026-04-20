import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import useAuthUser from "../hooks/useAuthUser";
import { HeadphonesIcon, PanelLeftIcon, Play, Pause, X, Volume2, VolumeX, UsersIcon, SkipBack, SkipForward, Camera } from "lucide-react";
import { useLayoutStore } from "../store/useLayoutStore";
import { useAudioStore } from "../store/useAudioStore";
import { useUnreadStore } from "../store/useUnreadStore";
import { getRecentChats } from "../lib/api";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const { isSidebarCollapsed, toggleSidebar, onlineUserIds } = useLayoutStore();
  const { currentTrack, isPlaying, volume, setVolume, togglePlayPause, stopTrack, playNext, playPrev } = useAudioStore();
  const { unreadCounts } = useUnreadStore();

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

            {/* Контейнер чатів: додаємо фіксовану висоту, щоб scale не розширював навбар вертикально */}
            <div
              className="flex items-center gap-4 overflow-x-auto overflow-y-hidden h-12 px-4
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
                    /* Видалили hover:mx-2, залишили тільки scale та z-index */
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
          <div className="flex items-center justify-center shrink-0 z-30 min-w-[400px]">
            {/* Додаємо перевірку isSidebarCollapsed */}
            {isSidebarCollapsed && currentTrack && (
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
            )}
          </div>

          {/* RIGHT SECTION: BALANCE */}
          <div className="hidden lg:flex items-center gap-4 flex-[1_1_0%] justify-end shrink-0"></div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;