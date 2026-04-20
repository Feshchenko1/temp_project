import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserFriends, addGroupMembers } from "../lib/api";
import { getSessionKey, importPublicKey, encryptSymmetricKey } from "../lib/crypto";
import toast from "react-hot-toast";
import { XIcon, UserPlusIcon, SearchIcon, ShieldCheck } from "lucide-react";

export default function AddMemberModal({ chatId, existingMembers = [], onClose }) {
  const queryClient = useQueryClient();
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends
  });

  // Filter out friends who are already in the group
  const potentialNewMembers = friends.filter(friend => 
    !existingMembers.some(member => member.id === friend.id)
  );

  const filteredPotential = potentialNewMembers.filter(f => 
    f.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { mutate: handleAddMembers, isPending } = useMutation({
    mutationFn: async () => {
      if (selectedFriends.length === 0) throw new Error("Select at least one friend");

      // 1. Get the current AES key for this chat from IndexedDB
      const aesKey = await getSessionKey(chatId);
      if (!aesKey) {
        throw new Error("Symmetric key not found locally. Please ensure the chat is secured before adding members.");
      }

      // 2. Prepare the groupKeys for the new members
      const newGroupKeys = [];
      const memberIds = [];

      for (const friendId of selectedFriends) {
        const friend = friends.find(f => f.id === friendId);
        if (!friend || !friend.publicKey) continue;

        try {
          const pubKey = await importPublicKey(friend.publicKey);
          const encryptedKey = await encryptSymmetricKey(pubKey, aesKey);
          
          newGroupKeys.push({
            recipientId: friend.id,
            encryptedKey: encryptedKey
          });
          memberIds.push(friend.id);
        } catch (err) {
          console.error(`Failed to wrap key for ${friend.fullName}:`, err);
        }
      }

      if (newGroupKeys.length === 0) {
        throw new Error("None of the selected friends have a valid public key.");
      }

      // 3. Send to backend
      return await addGroupMembers(chatId, {
        memberIds,
        groupKeys: newGroupKeys
      });
    },
    onSuccess: () => {
      toast.success("Members added successfully");
      queryClient.invalidateQueries(["recent-chats"]);
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add members");
    }
  });

  const toggleFriend = (id) => {
    setSelectedFriends(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex py-4 px-6 items-center justify-between border-b border-base-200">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserPlusIcon className="size-5 text-primary" />
            Add Members
          </h2>
          <button onClick={() => onClose()} className="btn btn-ghost btn-circle btn-sm">
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
            <input 
              type="text"
              placeholder="Search friends..."
              className="input input-sm input-bordered w-full pl-9 bg-base-200/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-1 border border-base-200 rounded-2xl overflow-hidden bg-base-200/50 p-2 max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 flex justify-center text-primary"><span className="loading loading-spinner" /></div>
            ) : filteredPotential.length === 0 ? (
              <p className="p-4 text-center text-sm opacity-50">No friends available to add.</p>
            ) : (
              filteredPotential.map(friend => (
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
                      <p className="text-[10px] text-error font-medium">No Public Key</p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="bg-primary/5 p-3 rounded-xl flex gap-3 items-start border border-primary/10">
            <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed opacity-70">
              New members will receive the current group encryption key wrapped with their RSA public key. This maintains end-to-end security automatically.
            </p>
          </div>
        </div>

        <div className="p-4 bg-base-200 flex justify-end gap-3 border-t border-base-300">
          <button onClick={() => onClose()} className="btn btn-ghost btn-sm px-6" disabled={isPending}>Cancel</button>
          <button 
            onClick={() => handleAddMembers()}
            className="btn btn-primary btn-sm px-6 shadow-lg shadow-primary/20"
            disabled={isPending || selectedFriends.length === 0}
          >
            {isPending ? <span className="loading loading-spinner size-4" /> : "Add Selected"}
          </button>
        </div>
      </div>
    </div>
  );
}
