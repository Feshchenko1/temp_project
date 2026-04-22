import React, { useState, useEffect } from "react";
import { X, Upload, Music, User, Hash, FileText, Loader2, Play } from "lucide-react";
import { useScoreStore } from "../store/useScoreStore";
import { createScore, updateScore, getScorePresignedUrl } from "../lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const ScoreFormModal = ({ isOpen, onClose, score = null }) => {
  const queryClient = useQueryClient();
  const { availableTags } = useScoreStore();

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    tags: [],
    fileUrl: "",
    audioUrl: "",
    fileSize: 0,
    pagesCount: 0,
  });

  const [uploadProgress, setUploadProgress] = useState({ pdf: 0, audio: 0 });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (score?.id) {
      setFormData({
        title: score.title || "",
        artist: score.artist || "",
        tags: score.tags || [],
        fileUrl: score.fileUrl || "",
        audioUrl: score.audioUrl || "",
        fileSize: score.fileSize || 0,
        pagesCount: score.pagesCount || 0,
      });
    } else {
      setFormData({
        title: "",
        artist: "",
        tags: [],
        fileUrl: "",
        audioUrl: "",
        fileSize: 0,
        pagesCount: 0,
      });
      setUploadProgress({ pdf: 0, audio: 0 });
    }
  }, [score, isOpen]);

  const createMutation = useMutation({
    mutationFn: createScore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scores"] });
      toast.success("Score added to library!");
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateScore(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scores"] });
      toast.success("Score updated successfully!");
      onClose();
    }
  });

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const filename = file.name;
      const fileType = file.type;

      const { presignedUrl, fileUrl } = await getScorePresignedUrl(filename, fileType);

      if (!presignedUrl) throw new Error("Failed to get upload URL");
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", fileType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress((prev) => ({ ...prev, [type]: progress }));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setFormData((prev) => ({
            ...prev,
            [type === "pdf" ? "fileUrl" : "audioUrl"]: fileUrl,
            ...(type === "pdf" ? { fileSize: file.size } : {}),
          }));
          toast.success(`${type.toUpperCase()} uploaded successfully!`);
        } else {
          toast.error(`Failed to upload ${type}`);
        }
        setIsUploading(false);
      };

      xhr.onerror = () => {
        toast.error(`Network error during ${type} upload`);
        setIsUploading(false);
      };

      xhr.send(file);
    } catch (error) {
      toast.error(error.message || "Upload failed");
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.fileUrl) {
      toast.error("Please provide at least a title and a score PDF.");
      return;
    }

    if (score?.id) {
      updateMutation.mutate({ id: score.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const isLoading = isUploading || createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-base-100 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 border-b border-base-300 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Music size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black">{score?.id ? "Edit" : "New"} Score</h2>
              <p className="text-xs font-bold text-base-content/40 uppercase tracking-widest">Library Management</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle hover:bg-error/10 hover:text-error transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 ml-1">Title</label>
              <div className="relative group">
                <Music className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Enter composition title"
                  className="input input-bordered w-full h-14 pl-12 rounded-2xl font-bold border-2 focus:border-primary transition-all bg-base-200/50"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 ml-1">Artist / Composer</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Unknown Artist"
                  className="input input-bordered w-full h-14 pl-12 rounded-2xl font-bold border-2 focus:border-primary transition-all bg-base-200/50"
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Uploaders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PDF Upload */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 ml-1">Score PDF (Required)</label>
              <div
                className={`relative h-32 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                  ${formData.fileUrl ? "border-success/40 bg-success/5" : "border-base-300 hover:border-primary/40 hover:bg-primary/5"}`}
                onClick={() => document.getElementById("pdfInput").click()}
              >
                <input id="pdfInput" type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, "pdf")} />
                {formData.fileUrl ? (
                  <>
                    <FileText size={32} className="text-success" />
                    <span className="text-[10px] font-black text-success uppercase">File Ready</span>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-base-content/20" />
                    <span className="text-[10px] font-black text-base-content/30 uppercase">Browse PDF</span>
                  </>
                )}
                {uploadProgress.pdf > 0 && uploadProgress.pdf < 100 && (
                  <div className="absolute inset-0 bg-base-100/80 flex items-center justify-center rounded-2xl">
                    <span className="font-black text-primary">{uploadProgress.pdf}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Audio Upload */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40 ml-1">Audio Reference (Optional)</label>
              <div
                className={`relative h-32 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                  ${formData.audioUrl ? "border-info/40 bg-info/5" : "border-base-300 hover:border-primary/40 hover:bg-primary/5"}`}
                onClick={() => document.getElementById("audioInput").click()}
              >
                <input id="audioInput" type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, "audio")} />
                {formData.audioUrl ? (
                  <>
                    <Play size={32} className="text-info" />
                    <span className="text-[10px] font-black text-info uppercase">Audio Ready</span>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-base-content/20" />
                    <span className="text-[10px] font-black text-base-content/30 uppercase">Browse Audio</span>
                  </>
                )}
                {uploadProgress.audio > 0 && uploadProgress.audio < 100 && (
                  <div className="absolute inset-0 bg-base-100/80 flex items-center justify-center rounded-2xl">
                    <span className="font-black text-primary">{uploadProgress.audio}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Hash size={16} className="text-primary" />
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40">Classification Tags</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2
                    ${formData.tags.includes(tag)
                      ? "bg-primary border-primary text-primary-content shadow-lg shadow-primary/20"
                      : "bg-base-200 border-transparent hover:border-primary/30"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-8 bg-base-200/50 flex gap-4">
          <button onClick={onClose} className="btn btn-ghost flex-1 rounded-2xl h-14 font-black uppercase text-xs">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn btn-primary flex-[2] rounded-2xl h-14 font-black uppercase text-xs shadow-xl shadow-primary/20"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              score?.id ? "Update Collection" : "Publish to Library"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoreFormModal;
