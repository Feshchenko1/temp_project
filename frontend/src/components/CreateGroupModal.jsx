import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserFriends, createGroupChat } from "../lib/api";
import { generateSymmetricKey, encryptSymmetricKey, importPublicKey } from "../lib/crypto";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser";
import { XIcon, UsersIcon, SearchIcon } from "lucide-react";

export default function CreateGroupModal({ onClose }) {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends
  });

  const { mutate: createGroup, isPending } = useMutation({
    mutationFn: async () => {
      if (!groupName.trim()) throw new Error("Group name is required");
      if (selectedFriends.length < 1) throw new Error("Select at least 1 friend");

      const aesKey = await generateSymmetricKey();

      const allMembers = [
        ...selectedFriends.map(id => friends.find(f => f.id === id)),
        authUser
      ];

      const groupKeys = [];
      const memberIds = [];

      for (const member of allMembers) {
        if (!member.publicKey) continue;
        const pubKey = await importPublicKey(member.publicKey);
        const encryptedKey = await encryptSymmetricKey(pubKey, aesKey);

        groupKeys.push({
          recipientId: member.id,
          encryptedKey: encryptedKey
        });
        memberIds.push(member.id);
      }

      if (groupKeys.length < 2) throw new Error("Not enough members with valid public keys");

      return await createGroupChat({
        name: groupName,
        memberIds,
        groupKeys,
        groupImage
      });
    },
    onSuccess: (newChat) => {
      toast.success("Group created successfully");
      queryClient.invalidateQueries(["recent-chats"]);
      onClose(newChat.id);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create group");
    }
  });

  const toggleFriend = (id) => {
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setGroupImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const filteredFriends = friends.filter(f =>
    f.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="flex py-4 px-6 items-center justify-between border-b border-base-200">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UsersIcon className="size-5 text-primary" />
            Create Group
          </h2>
          <button onClick={() => onClose()} className="btn btn-ghost btn-circle btn-sm">
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="size-24 rounded-2xl bg-base-200 border-2 border-dashed border-base-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 cursor-pointer">
                {imagePreview ? (
                  <img src={imagePreview} className="size-full object-cover" alt="Group Preview" />
                ) : (
                  <UsersIcon className="size-10 opacity-20" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/50 py-1.5 translate-y-full group-hover:translate-y-0 transition-transform flex justify-center">
                  <span className="text-[10px] text-white font-semibold">Change Avatar</span>
                </div>
              </div>
            </div>

            <div className="w-full space-y-1">
              <label className="text-sm font-semibold opacity-70">Group Name</label>
              <input
                type="text"
                placeholder="e.g. Band Practice, Tour Plans..."
                className="input input-bordered w-full bg-base-200 focus:bg-base-100 transition-colors"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold opacity-70">
                Members ({selectedFriends.length} selected)
              </label>
            </div>

            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
              <input
                type="text"
                placeholder="Search friends..."
                className="input input-sm input-bordered w-full pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-1 border border-base-200 rounded-2xl overflow-hidden bg-base-200/50 p-2 max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 flex justify-center text-primary"><span className="loading loading-spinner" /></div>
              ) : filteredFriends.length === 0 ? (
                <p className="p-4 text-center text-sm opacity-50">No friends found.</p>
              ) : (
                filteredFriends.map(friend => (
                  <label key={friend.id} className="flex items-center gap-3 p-2 hover:bg-base-100 rounded-xl cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm rounded-md"
                      checked={selectedFriends.includes(friend.id)}
                      onChange={() => toggleFriend(friend.id)}
                      disabled={!friend.publicKey}
                    />
                    <div className="avatar">
                      <div className="w-8 rounded-full">
                        <img src={friend.profilePic || "/avatar-placeholder.png"} alt={friend.fullName} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{friend.fullName}</p>
                      {!friend.publicKey && (
                        <p className="text-[10px] text-error font-medium">Keys not generated</p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-base-200 flex justify-end gap-3 border-t border-base-300">
          <button onClick={() => onClose()} className="btn btn-ghost disabled:opacity-50" disabled={isPending}>Cancel</button>
          <button
            onClick={() => createGroup()}
            className="btn btn-primary shadow-lg shadow-primary/20"
            disabled={isPending || !groupName.trim() || selectedFriends.length === 0}
          >
            {isPending ? <span className="loading loading-spinner size-4" /> : "Create Secure Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
