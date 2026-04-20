import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ListMusic, Plus, Loader2, Music2 } from "lucide-react";
import { getPlaylists, addTrackToPlaylist } from "../lib/api";
import { toast } from "react-hot-toast";

const AddToPlaylistModal = ({ isOpen, onClose, trackId }) => {
  const queryClient = useQueryClient();

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: getPlaylists,
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: ({ playlistId, trackId }) => addTrackToPlaylist(playlistId, trackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Track added to playlist!");
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Already in this playlist");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-base-300/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-base-100 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-base-300 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Plus size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Add to Playlist</h2>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mt-1">Select Collection</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle hover:bg-error/10 hover:text-error transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="size-10 text-primary animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Loading playlists...</p>
            </div>
          ) : playlists.length > 0 ? (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => mutation.mutate({ playlistId: playlist.id, trackId })}
                disabled={mutation.isPending}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all group border border-transparent hover:border-primary/20 text-left"
              >
                <div className="p-3 bg-base-200 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <ListMusic size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black truncate">{playlist.title}</p>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                    {playlist.tracks?.length || 0} Tracks
                  </p>
                </div>
                {mutation.isPending && <Loader2 className="size-4 animate-spin opacity-50" />}
              </button>
            ))
          ) : (
            <div className="text-center py-12 space-y-4 opacity-40">
              <Music2 size={48} className="mx-auto" />
              <p className="text-sm font-bold uppercase tracking-widest">No playlists found</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-base-200/50 border-t border-base-200">
           <button 
             onClick={onClose}
             className="btn btn-block rounded-2xl font-black"
           >
             Cancel
           </button>
        </div>
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
