import React from "react";
import { useScoreStore } from "../store/useScoreStore";
import useAuthUser from "../hooks/useAuthUser";
import {
  Heart,
  Download,
  ExternalLink,
  Trash2,
  User,
  Music,
  Calendar,
  Pencil,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import PdfPreview from "./PdfPreview";
import { useState } from "react";

const sanitizeFilename = (str) => {
  if (!str) return "";
  return str
    .replace(/[<>:"/\\|?*']/g, "")
    .replace(/\s+/g, "_")
    .trim();
};

const ScoreCard = ({ score, onEdit }) => {
  const { toggleFavorite, deleteScore } = useScoreStore();
  const { authUser } = useAuthUser();
  const [detectedPages, setDetectedPages] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const isOwner = score.userId === authUser?.id;
  const favoritesCount = score._count?.favoritedBy || 0;

  const handleDownload = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      const response = await fetch(score.fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

      const safeTitle = sanitizeFilename(score.title) || "score";
      const safeArtist = sanitizeFilename(score.artist) || "Unknown_Artist";
      link.download = `${safeArtist}_-_${safeTitle}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
    } finally {
      setIsDownloading(false);
    }
  };

  const handleView = () => {
    window.open(score.fileUrl, "_blank");
  };

  return (
    <div className="group relative bg-base-200/50 hover:bg-base-200 border border-base-300 hover:border-primary/30 rounded-[2rem] p-5 transition-all duration-500 backdrop-blur-md flex flex-col h-full shadow-xl hover:shadow-primary/5">
      {/* Header with Title & Artist */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-lg font-black text-base-content truncate group-hover:text-primary transition-colors">
            {score.title}
          </h3>
          <p className="text-sm text-base-content/60 truncate flex items-center gap-2 font-medium">
            <Music size={14} className="text-primary/40" />
            {score.artist || "Unknown Composer"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {favoritesCount > 0 && (
            <span className="text-xs font-bold text-red-500/80">{favoritesCount}</span>
          )}
          <button
            onClick={() => toggleFavorite(score.id)}
            className={`p-2 rounded-xl transition-all ${score.isFavorite
                ? "bg-error/20 text-error scale-110 shadow-lg shadow-error/20"
                : "bg-base-300/50 text-base-content/40 hover:text-error hover:bg-error/10"
              }`}
          >
            <Heart size={18} fill={score.isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Decorative Music Symbol or Icon / Real Preview */}
      <div className="flex-1 flex items-center justify-center p-6 mb-4 bg-white/[0.02] rounded-xl border border-white/5 group-hover:bg-blue-500/[0.03] transition-colors relative overflow-hidden min-h-[280px]">
        <PdfPreview
          fileUrl={score.fileUrl}
          className="absolute inset-0"
          onLoadSuccess={(pages) => setDetectedPages(pages)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <button onClick={handleView} className="btn btn-square btn-sm bg-base-100/80 border-none backdrop-blur-md text-base-content hover:btn-primary transition-all" aria-label="Open PDF">
            <ExternalLink size={16} />
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`btn btn-square btn-sm bg-base-100/80 border-none backdrop-blur-md text-base-content hover:btn-success transition-all ${isDownloading ? "cursor-not-allowed opacity-70" : ""}`}
            aria-label="Download"
          >
            {isDownloading ? (
              <Loader2 size={16} className="animate-spin text-success" />
            ) : (
              <Download size={16} />
            )}
          </button>
          {isOwner && (
            <>
              <button onClick={() => onEdit(score)} className="btn btn-square btn-sm bg-base-100/80 border-none backdrop-blur-md text-base-content hover:btn-info transition-all" aria-label="Edit">
                <Pencil size={16} />
              </button>
              <button onClick={() => deleteScore(score.id)} className="btn btn-square btn-sm bg-base-100/80 border-none backdrop-blur-md text-base-content hover:btn-error transition-all" aria-label="Delete">
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tags Section */}
      {score.tags && score.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4 h-[60px] overflow-hidden content-start">
          {score.tags?.map((tag, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary hover:text-primary-content transition-all cursor-default"
            >
              {typeof tag === "string" ? tag : tag.tag?.name}
            </span>
          ))}
        </div>
      ) : (
        <div className="h-[60px] flex items-center text-gray-600 italic text-[10px] uppercase tracking-widest px-1">
          No Tags Defined
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-auto pt-4 border-t border-base-300 flex items-center justify-between text-[11px] text-base-content/50 font-bold tracking-tight">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-base-300 ring-2 ring-base-100 shadow-sm">
            {score.user?.profilePic ? (
              <img src={score.user.profilePic} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={12} className="m-auto mt-1" />
            )}
          </div>
          <span className="truncate max-w-[80px]">{score.user?.fullName}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-primary font-black">{score.pagesCount || detectedPages || "?"}</span>
            <span className="opacity-60 text-[9px]">PGS</span>
          </div>
          <div className="w-px h-3 bg-base-300"></div>
          <div className="flex items-center gap-1.5 min-w-[70px] justify-end">
            <Calendar size={12} className="opacity-40" />
            {format(new Date(score.createdAt), "MMM d, yyyy")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
