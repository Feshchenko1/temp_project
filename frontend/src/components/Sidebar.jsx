import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useCallStore } from "../store/useCallStore";
import { BellIcon, LayoutDashboard, HeadphonesIcon, UsersIcon, FileMusic, Settings, LogOut, Check, Moon, Sun, Radio, Camera } from "lucide-react";
import GlobalMusicPlayer from "./GlobalMusicPlayer";
import { useLayoutStore } from "../store/useLayoutStore";
import { useThemeStore } from "../store/useThemeStore";
import { THEMES } from "../constants";
import useLogout from "../hooks/useLogout";
import { useUnreadStore } from "../store/useUnreadStore";
import { useNotificationStore } from "../store/useNotificationStore";

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = useLayoutStore((state) => state.isSidebarCollapsed);
  const { logoutMutation } = useLogout();
  const { theme, setTheme } = useThemeStore();
  const getTotalUnread = useUnreadStore((state) => state.getTotalUnread);
  const totalUnread = getTotalUnread();
  const pendingCount = useNotificationStore((state) => state.pendingRequests.length);
  const activeChatCalls = useCallStore((state) => state.activeChatCalls);
  const hasActiveCalls = activeChatCalls.length > 0;

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className={`z-50 ${isCollapsed ? "w-20" : "w-64"} bg-base-100 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0 shadow-lg transition-all duration-300 ease-in-out`}>
      <div className={`p-6 border-b border-base-300 ${isCollapsed ? "flex justify-center" : ""}`}>
        <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-105">
          <HeadphonesIcon className="size-8 text-primary drop-shadow-sm shrink-0" />
          {!isCollapsed && (
            <span className="text-3xl font-extrabold font-sans tracking-tight text-base-content whitespace-nowrap">
              Harmonix
            </span>
          )}
        </Link>
      </div>

      <nav className={`flex-1 p-4 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isCollapsed ? "flex flex-col items-center" : ""}`}>
        {[
          { to: "/", icon: LayoutDashboard, label: "Studio Dashboard" },
          { to: "/collaborators", icon: UsersIcon, label: "Collaborators" },
          { to: "/scores", icon: FileMusic, label: "Score Library" },
          { to: "/audio-library", icon: Radio, label: "Audio Library" },
          { to: "/notifications", icon: BellIcon, label: "Activity" },
        ].map((item) => {
          const isCollaborators = item.to === "/collaborators";
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`btn btn-ghost ${isCollapsed ? "btn-square" : "justify-start w-full"} gap-3 px-4 font-medium transition-all relative ${currentPath === item.to ? "bg-primary/10 text-primary" : "hover:bg-base-200"
                }`}
              title={isCollapsed ? item.label : ""}
            >
              <div className="relative">
                <item.icon className="size-5 shrink-0" />
                {isCollaborators && hasActiveCalls && isCollapsed && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <span className="flex-1 text-left whitespace-nowrap overflow-hidden flex items-center justify-between gap-2 min-w-0">
                  <span className="truncate">{item.label}</span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Call indicator for expanded view */}
                    {isCollaborators && hasActiveCalls && (
                      <div className="relative flex items-center justify-center size-5 animate-pulse bg-success/10 rounded-lg">
                        <Camera className="size-3 text-success fill-success/20" />
                      </div>
                    )}

                    {/* Unread Message Badge */}
                    {isCollaborators && totalUnread > 0 && (
                      <span className="badge badge-primary badge-sm animate-in fade-in zoom-in duration-300">
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    )}

                    {/* Activity / Friend Request Badges */}
                    {item.to === "/notifications" && pendingCount > 0 && (
                      <span className="badge badge-error badge-sm animate-in fade-in zoom-in duration-300">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                </span>
              )}

              {/* Badges for collapsed view*/}
              {isCollapsed && (
                <>
                  {isCollaborators && totalUnread > 0 && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                  )}
                  {item.to === "/notifications" && pendingCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* GLOBAL MUSIC PLAYER */}
      {!isCollapsed && <GlobalMusicPlayer />}

      {/* USER PROFILE SECTION WITH MANUAL STATE-DRIVEN DROPDOWN */}
      <div
        ref={profileMenuRef}
        className={`p-4 border-t border-base-300 bg-base-200/50 mt-auto backdrop-blur-sm relative w-full ${isCollapsed ? "flex justify-center" : ""}`}
      >
        <div
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          role="button"
          aria-expanded={isProfileMenuOpen}
          className={`flex items-center gap-3 w-full hover:bg-base-300/50 p-2 rounded-xl transition-colors cursor-pointer ${isCollapsed ? "justify-center" : ""}`}
        >
          <div className="avatar">
            <div className="w-10 rounded-full shadow-md ring-2 ring-primary/20">
              <img src={authUser?.profilePic} alt="User Avatar" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-sm truncate">{authUser?.fullName}</p>
              <p className="text-xs text-primary flex items-center gap-1.5 font-medium mt-0.5">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
                </span>
                Connected
              </p>
            </div>
          )}
        </div>

        {/* DROPDOWN MENU - MANUALLY RENDERED WITH ANIMATION */}
        {isProfileMenuOpen && (
          <ul
            className={`absolute menu p-2 shadow-2xl bg-base-100 rounded-box border border-base-300 z-[100] transition-all duration-200 ${isCollapsed
                ? "bottom-0 left-full ml-4 w-56 origin-bottom-left animate-in fade-in zoom-in-95"
                : "bottom-full left-4 right-4 mb-2 origin-bottom animate-in fade-in zoom-in-95"
              }`}
          >
            <li className="menu-title px-4 py-2 text-xs font-bold uppercase tracking-wider text-base-content/50">
              Account Actions
            </li>


            <li>
              <Link onClick={() => setIsProfileMenuOpen(false)} to="/profile-settings" className="flex items-center gap-3 py-3">
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </li>

            <div className="divider my-0"></div>

            <li className="menu-title px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-base-content/30">
              Appearance
            </li>

            {THEMES.map((t) => (
              <li key={t.name}>
                <button
                  onClick={() => {
                    setTheme(t.name);
                    setIsProfileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between py-2.5 ${theme === t.name ? "bg-primary/10 text-primary font-medium" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {t.name === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                    <span>{t.label}</span>
                  </div>
                  {theme === t.name && <Check className="size-4 text-primary" />}
                </button>
              </li>
            ))}

            <div className="divider my-0"></div>

            <li>
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  logoutMutation();
                }}
                className="flex items-center gap-3 py-3 text-error hover:bg-error/10"
              >
                <LogOut className="size-4" />
                <span>Sign Out</span>
              </button>
            </li>
          </ul>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
