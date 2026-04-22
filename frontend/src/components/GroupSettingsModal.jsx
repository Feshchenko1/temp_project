import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getChatDetails, removeGroupMember, leaveChat, updateGroupDetails } from "../lib/api";
import { XIcon, UsersIcon, UserMinusIcon, UserPlusIcon, LogOutIcon, ShieldCheckIcon, CalendarIcon, PencilIcon, CameraIcon, CheckIcon, RotateCcwIcon } from "lucide-react";
import toast from "react-hot-toast";
import AddMemberModal from "./AddMemberModal";

export default function GroupSettingsModal({ chatId, currentUserId, onClose }) {
  const queryClient = useQueryClient();
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedImage, setEditedImage] = useState(null);
  const fileInputRef = useRef(null);

  const { data: chat, isLoading } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => getChatDetails(chatId),
    enabled: !!chatId
  });

  useEffect(() => {
    if (chat?.name) {
      setEditedName(chat.name);
    }
  }, [chat?.name, isEditing]);

  const { mutate: handleRemoveMember, isPending: isRemoving } = useMutation({
    mutationFn: (memberId) => removeGroupMember(chatId, memberId),
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries(["chat", chatId]);
      queryClient.invalidateQueries(["recent-chats"]);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove member");
    }
  });

  const { mutate: handleLeaveGroup, isPending: isLeaving } = useMutation({
    mutationFn: () => leaveChat(chatId),
    onMutate: () => {
      onClose(true);
    },
    onSuccess: () => {
      toast.success("Left group");
      queryClient.invalidateQueries(["recent-chats"]);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to leave group");
    }
  });

  const { mutate: handleUpdateDetails, isPending: isUpdating } = useMutation({
    mutationFn: (payload) => updateGroupDetails(chatId, payload),
    onSuccess: () => {
      toast.success("Group updated successfully");
      setIsEditing(false);
      setEditedImage(null);
      queryClient.invalidateQueries(["chat", chatId]);
      queryClient.invalidateQueries(["recent-chats"]);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update group");
    }
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      return toast.error("Image must be smaller than 2MB");
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!editedName.trim()) return toast.error("Group name cannot be empty");

    handleUpdateDetails({
      name: editedName,
      groupImage: editedImage
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedName(chat?.name || "");
    setEditedImage(null);
  };

  if (isLoading || !chat) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="loading loading-spinner text-primary loading-lg" />
      </div>
    );
  }

  const currentUserMember = chat.members?.find(m => m.id === currentUserId);
  const isAdmin = currentUserMember?.role === "ADMIN";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-base-100 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 h-[80vh]">

          {/* HEADER */}
          <div className="flex py-5 px-6 items-center justify-between border-b border-base-200 bg-base-100 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl">
                <UsersIcon className="size-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold italic tracking-tight">
                {isEditing ? "Edit Group Details" : "Group Session"}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {isAdmin && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-ghost btn-circle btn-sm text-primary"
                  title="Edit Group"
                >
                  <PencilIcon className="size-4" />
                </button>
              )}
              <button onClick={() => onClose()} className="btn btn-ghost btn-circle btn-sm">
                <XIcon className="size-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* GROUP INFO */}
            <div className="p-8 flex flex-col items-center border-b border-base-200 bg-gradient-to-b from-base-200/50 to-transparent">
              <div className="avatar mb-4 group relative">
                <div
                  className={`w-24 h-24 rounded-3xl ring-4 ring-base-100 shadow-xl overflow-hidden bg-base-300 !flex items-center justify-center ${isEditing ? "cursor-pointer" : ""}`}
                >
                  {editedImage || chat.groupImage ? (
                    <img src={editedImage || chat.groupImage} alt={chat.name} className="object-cover w-full h-full" />
                  ) : (
                    <UsersIcon className="size-10 opacity-20" />
                  )}

                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <CameraIcon className="size-6 text-white" />
                    </div>
                  )}
                </div>

                {isEditing && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                )}
              </div>

              {isEditing ? (
                <div className="w-full max-w-xs mb-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Group Name"
                    className="input input-sm input-bordered w-full text-center font-bold"
                    autoFocus
                  />
                </div>
              ) : (
                <h3 className="text-2xl font-black mb-1">{chat.name}</h3>
              )}

              <p className="text-sm opacity-50 font-medium flex items-center gap-2">
                <CalendarIcon className="size-3" />
                Created {new Date(chat.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* MEMBERS LIST */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-widest opacity-40">Participants ({chat.members?.length})</h4>
                {isAdmin && (
                  <button
                    onClick={() => setIsAddMemberOpen(true)}
                    className="btn btn-primary btn-xs rounded-lg px-3 flex items-center gap-1.5"
                  >
                    <UserPlusIcon className="size-3" />
                    Add
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {chat.members?.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-base-200/50 border border-transparent hover:border-base-300 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="avatar">
                        <div className="w-10 rounded-xl">
                          <img src={member.profilePic || "/avatar-placeholder.png"} alt={member.fullName} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate flex items-center gap-1.5">
                          {member.fullName}
                          {member.id === currentUserId && <span className="badge badge-sm badge-ghost opacity-50 px-1 text-[9px]">YOU</span>}
                        </p>
                        <p className="text-[10px] opacity-50 font-medium uppercase tracking-wider flex items-center gap-1">
                          {member.role === "ADMIN" ? (
                            <>
                              <ShieldCheckIcon className="size-2.5 text-primary" />
                              <span className="text-primary">Admin</span>
                            </>
                          ) : "Member"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && member.id !== currentUserId && member.role !== "ADMIN" && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from group"
                        >
                          <UserMinusIcon className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ACTIONS FOOTER */}
          <div className="p-4 bg-base-200/50 flex justify-between items-center gap-3 border-t border-base-200">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="btn btn-ghost btn-sm px-4 flex items-center gap-2"
                  disabled={isUpdating}
                >
                  <RotateCcwIcon className="size-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary btn-sm px-6 flex items-center gap-2"
                  disabled={isUpdating || !editedName.trim()}
                >
                  {isUpdating ? <span className="loading loading-spinner loading-xs" /> : <CheckIcon className="size-4" />}
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleLeaveGroup()}
                  className="btn btn-ghost btn-sm text-error px-4 flex items-center gap-2"
                  disabled={isLeaving}
                >
                  <LogOutIcon className="size-4" />
                  {isLeaving ? "Leaving..." : "Leave Group"}
                </button>
                <button onClick={() => onClose()} className="btn btn-neutral btn-sm px-6">
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {isAddMemberOpen && (
        <AddMemberModal
          chatId={chatId}
          existingMembers={chat.members}
          onClose={() => setIsAddMemberOpen(false)}
        />
      )}
    </>
  );
}
