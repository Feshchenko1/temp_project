import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ListMusic, Plus, Loader2, AlignLeft } from "lucide-react";
import { createPlaylist } from "../lib/api";
import { toast } from "react-hot-toast";

const CreatePlaylistModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: createPlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist created successfully!");
      handleClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create playlist");
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleClose = () => {
    setTitle("");
    setDescription("");
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");

    setIsSubmitting(true);
    mutation.mutate({ title, description });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-base-300/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-base-100 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-base-300 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-secondary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
              <Plus size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">New Playlist</h2>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mt-1">Personal Collection</p>
            </div>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-circle hover:bg-error/10 hover:text-error transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="form-control">
              <label className="label text-[10px] font-black uppercase tracking-widest opacity-50 px-2">Playlist Title</label>
              <div className="relative group">
                 <ListMusic className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-base-content/20 group-focus-within:text-secondary transition-colors" />
                 <input
                   type="text"
                   placeholder="e.g. Late Night Vibes"
                   className="input input-bordered w-full pl-12 bg-base-200 border-none focus:ring-2 ring-secondary/20 transition-all font-bold"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   required
                 />
              </div>
            </div>

            <div className="form-control">
              <label className="label text-[10px] font-black uppercase tracking-widest opacity-50 px-2">Description (Optional)</label>
              <div className="relative group">
                 <AlignLeft className="absolute left-4 top-4 size-5 text-base-content/20 group-focus-within:text-secondary transition-colors" />
                 <textarea
                   placeholder="A collection of smooth tracks for deep work..."
                   className="textarea textarea-bordered w-full pl-12 pt-4 bg-base-200 border-none focus:ring-2 ring-secondary/20 transition-all font-bold min-h-[100px]"
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                 />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="btn flex-1 rounded-2xl font-black border-base-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="btn btn-secondary flex-[2] rounded-2xl font-black shadow-lg shadow-secondary/20 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Creating Library...</span>
                </>
              ) : (
                <span>Create Playlist</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlaylistModal;
