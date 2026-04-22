import { useModalStore } from "../store/useModalStore";
import { useCallStore } from "../store/useCallStore";
import { useProfileStore } from "../store/useProfileStore";
import useAuthUser from "../hooks/useAuthUser";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "../lib/socketClient";

import UploadTrackModal from "./UploadTrackModal";
import ScoreFormModal from "./ScoreFormModal";
import CreateGroupModal from "./CreateGroupModal";
import EditTrackModal from "./EditTrackModal";
import CreatePlaylistModal from "./CreatePlaylistModal";
import AddToPlaylistModal from "./AddToPlaylistModal";
import IncomingCallModal from "./IncomingCallModal";
import ProfileModal from "./ProfileModal";
import VideoCallOverlay from "./VideoCallOverlay";

const GlobalModals = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const isUploadTrackModalOpen = useModalStore(s => s.isUploadTrackModalOpen);
  const closeUploadTrackModal = useModalStore(s => s.closeUploadTrackModal);

  const isScoreFormModalOpen = useModalStore(s => s.isScoreFormModalOpen);
  const closeScoreFormModal = useModalStore(s => s.closeScoreFormModal);
  const selectedScore = useModalStore(s => s.selectedScore);

  const isCreateGroupModalOpen = useModalStore(s => s.isCreateGroupModalOpen);
  const closeCreateGroupModal = useModalStore(s => s.closeCreateGroupModal);

  const isEditTrackModalOpen = useModalStore(s => s.isEditTrackModalOpen);
  const closeEditTrackModal = useModalStore(s => s.closeEditTrackModal);
  const selectedTrack = useModalStore(s => s.selectedTrack);

  const isCreatePlaylistModalOpen = useModalStore(s => s.isCreatePlaylistModalOpen);
  const closeCreatePlaylistModal = useModalStore(s => s.closeCreatePlaylistModal);

  const isAddToPlaylistModalOpen = useModalStore(s => s.isAddToPlaylistModalOpen);
  const closeAddToPlaylistModal = useModalStore(s => s.closeAddToPlaylistModal);
  const trackToAdd = useModalStore(s => s.trackToAdd);

  const activeCall = useCallStore(s => s.activeCall);
  const endCall = useCallStore(s => s.endCall);

  return (
    <>
      <IncomingCallModal />
      <ProfileModal />

      <UploadTrackModal
        isOpen={isUploadTrackModalOpen}
        onClose={closeUploadTrackModal}
      />
      <ScoreFormModal
        isOpen={isScoreFormModalOpen}
        onClose={closeScoreFormModal}
        score={selectedScore}
      />
      {isCreateGroupModalOpen && (
        <CreateGroupModal onClose={closeCreateGroupModal} />
      )}
      <EditTrackModal
        isOpen={isEditTrackModalOpen}
        onClose={closeEditTrackModal}
        track={selectedTrack}
      />
      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={closeCreatePlaylistModal}
      />
      <AddToPlaylistModal
        isOpen={isAddToPlaylistModalOpen}
        onClose={closeAddToPlaylistModal}
        trackId={trackToAdd?.id}
      />

      {activeCall && authUser && (
        <VideoCallOverlay
          chatId={activeCall.chatId}
          targetUserId={activeCall.targetUserId}
          targetName={activeCall.targetName}
          currentUserId={authUser.id}
          isGroupCall={activeCall.isGroupCall}
          onEndCall={() => {
            const socket = getSocket();
            if (socket) {
              socket.emit("call:leave", { chatId: activeCall.chatId });
            }

            queryClient.setQueryData(["recent-chats"], (old) => {
              if (!old) return old;
              return old.map(c => c.id === activeCall.chatId ? { ...c, isCallActive: false, activeCallId: null } : c);
            });

            endCall();
          }}
        />
      )}
    </>
  );
};

export default GlobalModals;
