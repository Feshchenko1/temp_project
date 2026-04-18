import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { HeadphonesIcon, PanelLeftIcon } from "lucide-react";
import { useLayoutStore } from "../store/useLayoutStore";


const Navbar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const isChatPage = location.pathname?.startsWith("/chat");
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

  return (
    <nav className="bg-base-200/80 backdrop-blur-md border-b border-base-300 sticky top-0 z-50 h-16 flex items-center shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between w-full">
          {/* LEFT SECTION: TOGGLE & LOGO */}
          <div className="flex items-center gap-4">
            {authUser && (
              <button 
                onClick={toggleSidebar}
                className="btn btn-ghost btn-sm btn-square lg:flex hidden"
              >
                <PanelLeftIcon className="size-5" />
              </button>
            )}
            
            {isChatPage && (
              <Link to="/" className="flex items-center gap-2.5 transition-transform hover:scale-105">
                <HeadphonesIcon className="size-9 text-primary drop-shadow-md" />
                <span className="text-3xl font-extrabold font-sans bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent tracking-tight">
                  Harmonix
                </span>
              </Link>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};
export default Navbar;
