import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Image as ImageIcon, Upload, Loader2, Edit2 } from "lucide-react";
import { uploadFileDirectly, updateTrack } from "../lib/api";
import { toast } from "react-hot-toast";

const EditTrackModal = ({ isOpen, onClose, track }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (track) {
      setTitle(track.title || "");
      setArtist(track.artist || "");
      setCoverFile(null);
    }
  }, [track]);

  const updateMutation = useMutation({
    mutationFn: (data) => updateTrack(track.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Track updated successfully!");
      handleClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to edit track");
    },
  });

  const handleClose = () => {
    setTitle("");
    setArtist("");
    setCoverFile(null);
    setUploading(false);
    onClose();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    setUploading(true);
    try {
      let coverUrl = track?.coverUrl || null;

      if (coverFile) {
        const coverResult = await uploadFileDirectly(coverFile);
        coverUrl = coverResult.fileUrl;
      }

      await updateMutation.mutateAsync({
        title,
        artist,
        ...(coverFile && { coverUrl })
      });
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update track");
      setUploading(false);
    }
  };

  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-base-300/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-base-100 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-base-300 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-secondary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
              <Edit2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Edit Track</h2>
              <p className="text-xs text-secondary/50 font-bold uppercase tracking-widest mt-1">S3 Metadata Sync</p>
            </div>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-circle hover:bg-error/10 hover:text-error transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label text-[10px] font-black uppercase tracking-widest opacity-50 px-2">Track Title</label>
                <input
                  type="text"
                  placeholder="e.g. Midnight Jazz"
                  className="input input-bordered bg-base-200 border-none focus:ring-2 ring-secondary/20 transition-all font-bold"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label text-[10px] font-black uppercase tracking-widest opacity-50 px-2">Artist Name</label>
                <input
                  type="text"
                  placeholder="e.g. Harmonix Collective"
                  className="input input-bordered bg-base-200 border-none focus:ring-2 ring-secondary/20 transition-all font-bold"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label text-[10px] font-black uppercase tracking-widest opacity-50 px-2">Change Cover Art (Optional)</label>
              <div className={`relative group border-2 border-dashed rounded-2xl p-4 transition-all flex items-center gap-4 cursor-pointer ${coverFile ? "border-secondary/50 bg-secondary/5" : "border-base-300 hover:border-secondary/30"}`}>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => setCoverFile(e.target.files[0])}
                />
                <div className={`size-12 rounded-xl flex items-center justify-center overflow-hidden bg-base-200 ${coverFile ? "ring-2 ring-secondary/20" : ""}`}>
                  {coverFile ? (
                    <img src={URL.createObjectURL(coverFile)} alt="New cover" className="size-full object-cover" />
                  ) : track.coverUrl ? (
                    <img src={track.coverUrl} alt="Old cover" className="size-full object-cover opacity-50" />
                  ) : (
                    <ImageIcon className="size-6 text-base-content/20" />
                  )}
                </div>
                <div className="flex-1">
                  {coverFile ? (
                    <span className="text-xs font-black text-secondary truncate block">{coverFile.name}</span>
                  ) : (
                    <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-tighter">Choose a new square artwork</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="btn flex-1 rounded-2xl font-black border-base-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="btn btn-secondary flex-[2] rounded-2xl font-black shadow-lg shadow-secondary/20"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTrackModal;
