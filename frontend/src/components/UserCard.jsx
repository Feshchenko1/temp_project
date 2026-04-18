import { MapPinIcon, Music2Icon, GraduationCapIcon, LanguagesIcon } from "lucide-react";
import { useProfileStore } from "../store/useProfileStore";
import { useUnreadStore } from "../store/useUnreadStore";


const UserCard = ({ user, chatId, children }) => {
  const openProfile = useProfileStore((state) => state.openProfile);
  const unreadCount = useUnreadStore((state) => state.unreadCounts[chatId] || 0);

  if (!user) return null;

  const firstInstrument = user.instrumentsKnown?.[0];
  const moreInstruments = (user.instrumentsKnown?.length || 0) - 1;

  const firstToLearn = user.instrumentsToLearn?.[0];
  const moreToLearn = (user.instrumentsToLearn?.length || 0) - 1;

  const firstLanguage = user.spokenLanguages?.[0];
  const moreLanguages = (user.spokenLanguages?.length || 0) - 1;

  return (
    <div className="card bg-base-200 hover:shadow-xl transition-all duration-500 border border-base-300 h-[220px] group overflow-hidden relative">
      {unreadCount > 0 && (
        <div className="absolute top-3 right-3 z-10">
          <div className="badge badge-primary badge-md font-bold animate-in zoom-in duration-300 shadow-lg">
            {unreadCount}
          </div>
        </div>
      )}
      <div className="card-body p-4 flex flex-col justify-between h-full">
        {/* HEADER AREA - CLICKABLE */}
        <div
          className="flex items-center gap-3 cursor-pointer group/header"
          onClick={() => openProfile(user)}
        >
          <div className="avatar">
            <div className="w-12 h-12 rounded-full ring-2 ring-primary ring-offset-base-100 ring-offset-2 transition-all duration-300 group-hover/header:scale-105">
              <img src={user.profilePic || "/avatar.png"} alt={user.fullName} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight truncate group-hover/header:text-primary transition-colors">
              {user.fullName}
            </h3>
            {user.location && (
              <div className="flex items-center text-[10px] uppercase font-bold tracking-widest opacity-50 truncate mt-1">
                <MapPinIcon className="size-3 shrink-0 mr-1" />
                <span className="truncate">{user.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* ULTRA-COMPACT TAGS (1 PER CATEGORY) */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {firstInstrument ? (
            <div className="flex items-center gap-1">
              <span className="badge badge-primary badge-sm px-2 py-2.5 font-medium gap-1">
                <Music2Icon className="size-3" />
                {firstInstrument}
              </span>
              {moreInstruments > 0 && <span className="text-[10px] opacity-40 font-bold">+{moreInstruments}</span>}
            </div>
          ) : (
            <span className="text-[10px] italic opacity-30">No instruments</span>
          )}
          {firstToLearn ? (
            <div className="flex items-center gap-1">
              <span className="badge badge-outline badge-sm px-2 py-2.5 opacity-80 gap-1">
                <GraduationCapIcon className="size-3" />
                {firstToLearn}
              </span>
              {moreToLearn > 0 && <span className="text-[10px] opacity-40 font-bold">+{moreToLearn}</span>}
            </div>
          ) : (
            <span className="text-[10px] italic opacity-30">No learning</span>
          )}
          {firstLanguage ? (
            <div className="flex items-center gap-1">
              <span className="badge badge-ghost badge-sm px-2 py-2.5 bg-base-300 text-[10px] uppercase font-bold gap-1">
                <LanguagesIcon className="size-3" />
                {firstLanguage}
              </span>
              {moreLanguages > 0 && <span className="text-[10px] opacity-40 font-bold">+{moreLanguages}</span>}
            </div>
          ) : (
            <span className="text-[10px] italic opacity-30">No languages</span>
          )}
        </div>

        {/* COMPACT BIO */}
        <p className={`text-xs mt-1 min-h-[1.25rem] truncate w-full ${user.bio ? "text-base-content/60 italic" : "text-base-content/20 italic"}`}>
          {user.bio ? `"${user.bio}"` : "No bio provided."}
        </p>

        {/* ACTION BUTTON AREA */}
        <div className="card-actions mt-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
