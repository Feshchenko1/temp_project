import React from "react";
import { FileIcon, MusicIcon, VideoIcon, DownloadIcon } from "lucide-react";

const MessageAttachment = ({ url, originalName, fileType }) => {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return null;

  const lowUrl = url.toLowerCase();

  const isImage = (fileType && fileType.startsWith("image/")) || /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(lowUrl) || url.includes("profile-pics");
  const isAudio = (fileType && fileType.startsWith("audio/")) || /\.(mp3|wav|ogg|flac|m4a)$/i.test(lowUrl);
  const isVideo = (fileType && fileType.startsWith("video/")) || /\.(mp4|webm|ogg|mov)$/i.test(lowUrl);

  const displayName = originalName || url.split("/").pop().split("?")[0];


  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = displayName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const link = document.createElement("a");
      link.href = url;
      link.download = displayName;
      link.target = "_blank";
      link.click();
    }
  };


  if (isImage) {
    return (
      <div className="mt-2 group relative overflow-hidden rounded-xl border border-white/10 shadow-lg max-w-sm">
        <img
          src={url}
          alt="Attachment"
          className="max-w-full h-auto object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleDownload} className="btn btn-circle btn-xs bg-black/50 border-none">
            <DownloadIcon size={12} className="text-white" />
          </button>
        </div>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="mt-2 p-3 bg-base-300 rounded-xl border border-white/5 flex flex-col gap-2 w-full max-w-[280px]">
        <div className="flex items-center gap-2 text-xs opacity-60">
          <MusicIcon size={14} className="text-primary" />
          <span className="truncate flex-1">{displayName}</span>
        </div>
        <audio controls className="w-full h-8 brightness-90 saturate-50 contrast-125">
          <source src={url} />
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-2 rounded-xl border border-white/10 overflow-hidden shadow-xl bg-black max-w-sm relative group">
        <video controls className="w-full max-h-[300px]">
          <source src={url} />
        </video>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleDownload} className="btn btn-circle btn-xs bg-black/50 border-none">
            <DownloadIcon size={12} className="text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-base-100 rounded-xl border border-white/5 flex items-center gap-3 hover:bg-base-200 transition-colors group cursor-default max-w-xs">
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-content transition-colors overflow-hidden">
        <FileIcon size={20} />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-[10px] opacity-40 uppercase font-bold tracking-wider">Attachment</p>
      </div>
      <button
        onClick={handleDownload}
        className="btn btn-ghost btn-circle btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <DownloadIcon size={16} />
      </button>
    </div>
  );
};

export default MessageAttachment;
