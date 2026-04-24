import { useProfileStore } from "../store/useProfileStore";
import { MapPinIcon, XIcon, MusicIcon, GraduationCapIcon, LanguagesIcon, MessageSquareIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { getOrCreateChatByUserId, markChatAsRead, getUserFriends } from "../lib/api";
import { useUnreadStore } from "../store/useUnreadStore";
import { useQuery } from "@tanstack/react-query";
import useAuthUser from "../hooks/useAuthUser";
import toast from "react-hot-toast";

const ProfileModal = () => {
  const { selectedProfile, isOpen, closeProfile } = useProfileStore();
  const navigate = useNavigate();
  const { clearCount, unreadCounts } = useUnreadStore();
  const { authUser } = useAuthUser();

  const { data: friends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: !!authUser && isOpen,
  });

  if (!selectedProfile) return null;

  const isFriend = friends?.some((f) => f.id === selectedProfile.id);
  const isMe = authUser?.id === selectedProfile.id;
  const showMessageButton = isFriend && !isMe;

  const handleMessageClick = async () => {
    try {
      const chat = await getOrCreateChatByUserId(selectedProfile.id);

      if (unreadCounts[chat.id]?.count > 0) {
        try {
          await markChatAsRead(chat.id);
          clearCount(chat.id);
        } catch (readError) {
          console.error("Error marking chat as read:", readError);
        }
      }

      closeProfile();
      navigate(`/collaborators?chatId=${chat.id}`);
    } catch (error) {
      console.error("Error creating/navigating to chat:", error);
      toast.error("Failed to open chat");
    }
  };

  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box p-0 max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-base-100 border border-base-300 shadow-2xl">
        {/* HEADER / COVER IMAGE AREA*/}
        <div className="relative h-[30vh] max-h-[300px] flex-none bg-base-300">
          <img
            src={selectedProfile.profilePic}
            alt={selectedProfile.fullName}
            className="w-full h-full object-cover"
          />
          <button
            onClick={closeProfile}
            className="btn btn-circle btn-sm absolute right-4 top-4 bg-base-100/50 backdrop-blur-md border-none hover:bg-base-100 transition-all"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
          <div className="space-y-8">
            {/* USER INFO */}
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold tracking-tight">{selectedProfile.fullName}</h2>
              {selectedProfile.location && (
                <div className="flex items-center text-base opacity-70 gap-1.5">
                  <MapPinIcon className="size-4 shrink-0 text-primary" />
                  <span>{selectedProfile.location}</span>
                </div>
              )}
            </div>

            <div className="divider my-0"></div>

            {/* BIO SECTION */}
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider opacity-50">About</h3>
              <div className="text-base leading-relaxed text-base-content/80">
                {selectedProfile.bio ? selectedProfile.bio : <span className="italic opacity-50">No bio provided.</span>}
              </div>
            </div>

            {/* ATTRIBUTES GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* INSTRUMENTS */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-primary">
                  <MusicIcon className="size-4" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Instruments</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.instrumentsKnown?.length > 0 ? (
                    selectedProfile.instrumentsKnown.map((inst) => (
                      <span key={inst} className="badge badge-primary badge-outline px-3 py-3">
                        {inst}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm italic opacity-40">No instruments listed.</span>
                  )}
                </div>
              </div>

              {/* LEARNING */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-secondary">
                  <GraduationCapIcon className="size-4" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Learning</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.instrumentsToLearn?.length > 0 ? (
                    selectedProfile.instrumentsToLearn.map((inst) => (
                      <span key={inst} className="badge badge-secondary badge-outline px-3 py-3">
                        {inst}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm italic opacity-40">No targets listed.</span>
                  )}
                </div>
              </div>

              {/* LANGUAGES */}
              <div className="space-y-3 col-span-full mb-6">
                <div className="flex items-center gap-2 text-accent">
                  <LanguagesIcon className="size-4" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Spoken Languages</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.spokenLanguages?.length > 0 ? (
                    selectedProfile.spokenLanguages.map((lang) => (
                      <span key={lang} className="badge badge-accent badge-outline px-3 py-3">
                        {lang}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm italic opacity-40">No languages listed.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="p-4 border-t border-base-300 bg-base-200/50 flex-none sticky bottom-0 z-10 flex gap-2">
          {showMessageButton && (
            <button onClick={handleMessageClick} className="btn btn-primary flex-1 font-bold">
              <MessageSquareIcon className="size-4 mr-2" />
              Message
            </button>
          )}
          <button onClick={closeProfile} className={`btn btn-ghost ${!showMessageButton ? "flex-1" : ""}`}>
            Close Profile
          </button>
        </div>
      </div>

      {/* CLICK OUTSIDE TO CLOSE */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={closeProfile}>close</button>
      </form>
    </dialog>
  );
};

export default ProfileModal;

