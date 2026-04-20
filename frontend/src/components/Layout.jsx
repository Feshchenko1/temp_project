import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import AudioEngine from "./AudioEngine";

const Layout = ({ children, showSidebar = false }) => {
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar />}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar />

          <main className="flex-1 overflow-y-auto bg-base-300/20">{children}</main>
        </div>
      </div>
      <AudioEngine />
    </div>
  );
};
export default Layout;
