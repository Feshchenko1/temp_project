import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Music, Image as ImageIcon, Upload, Loader2, Music2 } from "lucide-react";
import { uploadFileDirectly, createTrack } from "../lib/api";
import { toast } from "react-hot-toast";

const UploadTrackModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: createTrack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      toast.success("Track uploaded successfully!");
      handleClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create track record");
    },
  });

  const handleClose = () => {
    setTitle("");
    setArtist("");
    setAudioFile(null);
    setCoverFile(null);
    setUploading(false);
    onClose();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!audioFile) return toast.error("Audio file is required");

    setUploading(true);
    try {
      const audioResult = await uploadFileDirectly(audioFile);

      let coverUrl = null;
      if (coverFile) {
        const coverResult = await uploadFileDirectly(coverFile);
        coverUrl = coverResult.fileUrl;
      }

      await createMutation.mutateAsync({
        title: title || audioFile.name.split(".")[0],
        artist: artist || "Unknown Artist",
        fileUrl: audioResult.fileUrl,
        coverUrl,
        duration: audioDuration,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload track files");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-base-300/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-base-100 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-base-300 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Upload New Track</h2>
              <p className="text-xs text-base-content/50 font-bold uppercase tracking-widest mt-1">S3 Cloud Ingestion</p>
            </div>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-circle hover:bg-error/10 hover:text-error transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-8 space-y-6">
          <div className="space-y-4">
            {/* Title & Artist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label text-[10px] font-black uppercase tracking-widest opacity-50 px-2">Track Title</label>
                <input
                  type="text"
                  placeholder="e.g. Midnight Jazz"
                  className="input input-bordered w-full bg-transparent border-base-content/20 focus:border-primary transition-all font-bold"
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
                  className="input input-bordered w-full bg-transparent border-base-content/20 focus:border-primary transition-all font-bold"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Audio File Input */}
            <div className="form-control">
              <label className="label text-[10px] font-black uppercase tracking-widest opacity-50 px-2">Audio File (MP3, WAV)</label>
              <div className={`relative group border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${audioFile ? "border-primary/50 bg-primary/5" : "border-base-300 hover:border-primary/30"}`}>
                <input
                  type="file"
                  accept="audio/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setAudioFile(file);
                      const audio = new Audio(URL.createObjectURL(file));
                      audio.onloadedmetadata = () => {
                        setAudioDuration(Math.floor(audio.duration));
                      };
                    } else {
                      setAudioFile(null);
                      setAudioDuration(0);
                    }
                  }}
                />
                {audioFile ? (
                  <>
                    <Music2 className="size-10 text-primary animate-pulse" />
                    <span className="text-sm font-black text-primary truncate max-w-full italic">{audioFile.name}</span>
                  </>
                ) : (
                  <>
                    <Music className="size-10 text-base-content/20 group-hover:text-primary/50 transition-colors" />
                    <span className="text-xs font-bold text-base-content/40 tracking-tight">Drop audio or click to browse</span>
                  </>
                )}
              </div>
              {audioFile && (
                <div className="mt-4 p-4 bg-base-200 rounded-xl border border-base-300 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-xs font-bold mb-2 text-base-content/70 flex items-center gap-2">
                    <Music2 className="size-3" /> Audio Preview
                  </p>
                  <audio
                    controls
                    className="w-full h-10"
                    src={URL.createObjectURL(audioFile)}
                  />
                </div>
              )}
            </div>

            {/* Cover Image Input */}
            <div className="form-control">
              <label className="label text-[10px] font-black uppercase tracking-widest opacity-50 px-2">Cover Art (Optional)</label>
              <div className={`relative group border-2 border-dashed rounded-2xl p-4 transition-all flex items-center gap-4 cursor-pointer ${coverFile ? "border-secondary/50 bg-secondary/5" : "border-base-300 hover:border-secondary/30"}`}>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => setCoverFile(e.target.files[0])}
                />
                <div className={`size-12 rounded-xl flex items-center justify-center overflow-hidden bg-base-200 ${coverFile ? "ring-2 ring-secondary/20" : ""}`}>
                  {coverFile ? (
                    <img src={URL.createObjectURL(coverFile)} alt="Preview" className="size-full object-cover" />
                  ) : (
                    <ImageIcon className="size-6 text-base-content/20" />
                  )}
                </div>
                <div className="flex-1">
                  {coverFile ? (
                    <span className="text-xs font-black text-secondary truncate block">{coverFile.name}</span>
                  ) : (
                    <span className="text-[10px] font-bold text-base-content/40 uppercase tracking-tighter">Choose a square artwork</span>
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
              disabled={uploading || !audioFile}
              className="btn btn-primary flex-[2] rounded-2xl font-black shadow-lg shadow-primary/20"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Ingesting Track...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Start Upload</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadTrackModal;
