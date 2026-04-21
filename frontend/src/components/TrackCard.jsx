import React from "react";
import { Play, Pause, Trash2, Clock, User, Music2, MoreVertical, Heart, Edit2 } from "lucide-react";
import { useAudioStore } from "../store/useAudioStore";
import useAuthUser from "../hooks/useAuthUser";

const formatDuration = (seconds) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const TrackCard = ({ track, onPlay, onDelete, onContextMenu, isLiked, onToggleLike, onEdit }) => {
  const { currentTrack, isPlaying, togglePlayPause } = useAudioStore();
  const { authUser } = useAuthUser();
  const isSelected = currentTrack?.id === track.id;
  const isCurrentPlaying = isSelected && isPlaying;

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (isSelected) {
      togglePlayPause();
    } else {
      onPlay();
    }
  };

  return (
    <div 
      className={`group relative bg-base-100 rounded-[2rem] p-4 border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${
        isSelected ? "border-primary ring-4 ring-primary/10 shadow-xl" : "border-base-300 hover:border-primary/30"
      }`}
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 shadow-inner bg-base-200">
        {track.coverUrl ? (
          <img 
            src={track.coverUrl} 
            alt={track.title} 
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isCurrentPlaying ? "animate-[pulse_4s_infinite]" : ""}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <Music2 className="size-16 text-primary/20" />
          </div>
        )}
        
        {/* Play Overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isSelected ? "opacity-100 bg-black/20" : "opacity-0 group-hover:opacity-100 bg-black/40"}`}>
          <button 
            onClick={handlePlayClick}
            className="btn btn-circle btn-primary btn-lg shadow-2xl scale-90 group-hover:scale-100 transition-transform active:scale-95"
          >
            {isCurrentPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
          </button>
        </div>
      </div>

      <div className="space-y-2 px-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-black text-lg tracking-tight truncate ${isSelected ? "text-primary" : "text-base-content"}`}>
              {track.title}
            </h3>
            <p className="text-sm font-bold opacity-50 flex items-center gap-1.5 truncate">
              <User size={14} />
              {track.artist}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
              className={`btn btn-ghost btn-sm btn-square transition-all ${isLiked ? "text-error opacity-100" : "opacity-0 group-hover:opacity-100 hover:bg-base-200"}`}
            >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onContextMenu(e, track); }}
              className="btn btn-ghost btn-sm btn-square opacity-0 group-hover:opacity-100 transition-opacity hover:bg-base-200"
            >
              <MoreVertical size={16} />
            </button>
            {authUser?.id === track.userId && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(track); }}
                  className="btn btn-ghost btn-sm btn-square text-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary/10"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(track.id); }}
                  className="btn btn-ghost btn-sm btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/10"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-base-200">
          <div className="flex items-center gap-2 opacity-30">
            <Clock size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {new Date(track.createdAt).toLocaleDateString()}
            </span>
            <span className="mx-1">•</span>
            <span className="text-[10px] font-black tracking-widest">
              {formatDuration(track.duration)}
            </span>
          </div>
          {isSelected && (
            <div className="flex gap-1 items-end h-3">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1 bg-primary rounded-full animate-music-bar`} 
                  style={{ 
                    animationDelay: `${i * 0.1}s`,
                    animationPlayState: isPlaying ? "running" : "paused"
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackCard;
