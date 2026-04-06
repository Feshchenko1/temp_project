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
} from "lucide-react";
import { format } from "date-fns";
import PdfPreview from "./PdfPreview";

const ScoreCard = ({ score }) => {
  const { toggleFavorite, deleteScore } = useScoreStore();
  const { authUser } = useAuthUser();
  
  const isOwner = score.userId === authUser?.id;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = score.fileUrl;
    link.download = `${score.title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = () => {
    window.open(score.fileUrl, "_blank");
  };

  return (
    <div className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-blue-500/30 rounded-2xl p-5 transition-all duration-300 backdrop-blur-md flex flex-col h-full shadow-xl hover:shadow-blue-500/5">
      {/* Header with Title & Artist */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-lg font-bold text-white truncate group-hover:text-blue-400 transition-colors">
            {score.title}
          </h3>
          <p className="text-sm text-gray-400 truncate flex items-center gap-2">
            <Music size={14} className="text-gray-500" />
            {score.artist || "Unknown Composer"}
          </p>
        </div>
        <button 
          onClick={() => toggleFavorite(score.id)}
          className={`p-2 rounded-xl transition-all ${
            score.isFavorite 
              ? "bg-red-500/20 text-red-500 scale-110 shadow-lg shadow-red-500/20" 
              : "bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
          }`}
        >
          <Heart size={18} fill={score.isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Decorative Music Symbol or Icon / Real Preview */}
      <div className="flex-1 flex items-center justify-center p-6 mb-4 bg-white/[0.02] rounded-xl border border-white/5 group-hover:bg-blue-500/[0.03] transition-colors relative overflow-hidden min-h-[280px]">
        <PdfPreview fileUrl={score.fileUrl} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <button onClick={handleView} className="p-2 bg-black/80 text-white rounded-lg hover:bg-blue-600 transition-colors tooltip tooltip-bottom" data-tip="Open PDF">
             <ExternalLink size={16} />
           </button>
           <button onClick={handleDownload} className="p-2 bg-black/80 text-white rounded-lg hover:bg-green-600 transition-colors tooltip tooltip-bottom" data-tip="Download">
             <Download size={16} />
           </button>
           {isOwner && (
             <button onClick={() => deleteScore(score.id)} className="p-2 bg-black/80 text-white rounded-lg hover:bg-red-600 transition-colors tooltip tooltip-bottom" data-tip="Delete">
               <Trash2 size={16} />
             </button>
           )}
        </div>
      </div>

      {/* Tags Section */}
      <div className="flex flex-wrap gap-2 mb-4 h-[60px] overflow-hidden content-start">
        {score.tags?.map((tag, idx) => (
          <span 
            key={idx} 
            className="px-2.5 py-1 bg-white/[0.05] border border-white/10 rounded-full text-[10px] font-bold text-gray-300 uppercase tracking-wider hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 transition-all cursor-default"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500 font-medium">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10 ring-1 ring-white/10">
            {score.user?.profilePic ? (
              <img src={score.user.profilePic} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={12} className="m-auto mt-1" />
            )}
          </div>
          <span className="truncate max-w-[80px]">{score.user?.fullName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={12} />
          {format(new Date(score.createdAt), "MMM d, yyyy")}
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
