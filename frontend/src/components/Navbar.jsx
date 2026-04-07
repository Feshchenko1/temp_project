import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LogOutIcon, HeadphonesIcon } from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";

import { useNotificationStore } from "../store/useNotificationStore";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const isChatPage = location.pathname?.startsWith("/chat");
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const { logoutMutation } = useLogout();

  return (
    <nav className="bg-base-200/80 backdrop-blur-md border-b border-base-300 sticky top-0 z-50 h-16 flex items-center shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end w-full">
          {/* LOGO - ONLY IN CHAT / TOP LEVEL */}
          {isChatPage && (
            <div className="pl-5">
              <Link to="/" className="flex items-center gap-2.5 transition-transform hover:scale-105">
                <HeadphonesIcon className="size-9 text-primary drop-shadow-md" />
                <span className="text-3xl font-extrabold font-sans bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent tracking-tight">
                  Harmonix
                </span>
              </Link>
            </div>
          )}

          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            <Link to={"/notifications"} className="tooltip tooltip-bottom hidden sm:flex" data-tip="Notifications">
              <button className="btn btn-ghost btn-circle relative">
                <BellIcon className="size-5 text-base-content" />
                {unreadCount > 0 && (
                  <span className="badge badge-sm badge-error absolute -top-1 -right-1 text-white border-2 border-base-200">
                    {unreadCount}
                  </span>
                )}
              </button>
            </Link>
          </div>

          <ThemeSelector />

          {authUser && (
            <div className="avatar ml-2">
              <div className="w-9 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img src={authUser?.profilePic} alt="User Avatar" rel="noreferrer" />
              </div>
            </div>
          )}

          {authUser && (
            <button className="btn btn-ghost btn-circle ml-2 tooltip tooltip-bottom" data-tip="Log out" onClick={logoutMutation}>
              <LogOutIcon className="size-5 text-base-content" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
