import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LayoutDashboard, HeadphonesIcon, UsersIcon } from "lucide-react";
import GlobalMusicPlayer from "./GlobalMusicPlayer";

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="w-64 bg-base-100 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0 shadow-lg">
      <div className="p-6 border-b border-base-300">
        <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-105">
          <HeadphonesIcon className="size-8 text-primary drop-shadow-sm" />
          <span className="text-3xl font-extrabold font-sans tracking-tight text-base-content">
            Harmonix
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <Link
          to="/"
          className={`btn btn-ghost justify-start w-full gap-3 px-4 font-medium transition-colors ${
            currentPath === "/" ? "bg-primary/10 text-primary" : "hover:bg-base-200"
          }`}
        >
          <LayoutDashboard className="size-5" />
          <span>Studio Dashboard</span>
        </Link>

        <Link
          to="/friends"
          className={`btn btn-ghost justify-start w-full gap-3 px-4 font-medium transition-colors ${
            currentPath === "/friends" ? "bg-primary/10 text-primary" : "hover:bg-base-200"
          }`}
        >
          <UsersIcon className="size-5" />
          <span>Collaborators</span>
        </Link>

        <Link
          to="/notifications"
          className={`btn btn-ghost justify-start w-full gap-3 px-4 font-medium transition-colors ${
            currentPath === "/notifications" ? "bg-primary/10 text-primary" : "hover:bg-base-200"
          }`}
        >
          <BellIcon className="size-5" />
          <span>Activity</span>
        </Link>
      </nav>

      {/* GLOBAL MUSIC PLAYER */}
      <GlobalMusicPlayer />

      {/* USER PROFILE SECTION */}
      <div className="p-4 border-t border-base-300 bg-base-200/50 mt-auto backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 rounded-full shadow-md">
              <img src={authUser?.profilePic} alt="User Avatar" />
            </div>
          </div>
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
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
