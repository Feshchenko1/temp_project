import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Repeat,
  Repeat1,
  Shuffle,
  Music,
  X
} from "lucide-react";
import { useAudioStore } from "../store/useAudioStore";

const GlobalMusicPlayer = () => {
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    loopMode, 
    isShuffled,
    currentTime,
    duration,
    togglePlayPause, 
    setVolume, 
    toggleLoopMode,
    toggleShuffle,
    playNext,
    playPrev,
    stopTrack,
    triggerSeek
  } = useAudioStore();

  if (!currentTrack) return null;

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    triggerSeek(time);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-base-200/80 backdrop-blur-md border border-base-300 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 relative">
      <button 
        onClick={stopTrack} 
        className="absolute top-2 right-2 p-1.5 text-base-content/40 hover:text-error hover:bg-error/10 rounded-full transition-colors z-10"
        aria-label="Close Player"
      >
        <X size={14} />
      </button>

      {/* Track Info */}
      <div className="flex items-center gap-3 p-3 border-b border-base-300">
        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner group relative overflow-hidden">
          {currentTrack.user?.profilePic ? (
            <img src={currentTrack.user.profilePic} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music className="text-primary size-6" />
          )}
          {isPlaying && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <div className="flex gap-0.5 items-end h-4">
                <style>
                  {`
                    @keyframes music-bar {
                      0%, 100% { height: 4px; }
                      50% { height: 16px; }
                    }
                    .animate-music-bar-1 { animation: music-bar 0.6s ease-in-out infinite; }
                    .animate-music-bar-2 { animation: music-bar 0.8s ease-in-out infinite; }
                    .animate-music-bar-3 { animation: music-bar 0.7s ease-in-out infinite; }
                  `}
                </style>
                <div className="w-1 bg-primary rounded-full animate-music-bar-1"></div>
                <div className="w-1 bg-primary rounded-full animate-music-bar-2"></div>
                <div className="w-1 bg-primary rounded-full animate-music-bar-3"></div>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-base-content truncate">
            {currentTrack.title}
          </h4>
          <p className="text-[10px] uppercase tracking-widest font-bold text-base-content/40 truncate">
            {currentTrack.artist || "Unknown Artist"}
          </p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Controls */}
        <div className="flex items-center justify-between px-2">
          {/* Shuffle & Repeat */}
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleShuffle}
              className={`btn btn-ghost btn-xs btn-circle ${isShuffled ? 'text-primary' : 'text-base-content/30'}`}
              title="Shuffle"
            >
              <Shuffle size={14} />
            </button>
            <button 
              onClick={toggleLoopMode}
              className={`btn btn-ghost btn-xs btn-circle ${loopMode > 0 ? 'text-primary' : 'text-base-content/30'}`}
              title={loopMode === 2 ? "Loop Track" : loopMode === 1 ? "Loop Queue" : "Loop Off"}
            >
              {loopMode === 2 ? <Repeat1 size={14} /> : <Repeat size={14} />}
            </button>
          </div>

          {/* Core Playback */}
          <div className="flex items-center gap-3">
            <button 
              onClick={playPrev}
              className="btn btn-ghost btn-sm btn-circle text-base-content/70 hover:text-primary transition-colors"
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={togglePlayPause}
              className="btn btn-primary btn-sm btn-circle shadow-lg shadow-primary/20 transition-transform active:scale-90"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>

            <button 
              onClick={playNext}
              className="btn btn-ghost btn-sm btn-circle text-base-content/70 hover:text-primary transition-colors"
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div className="w-12"></div> {/* Spacer for symmetry */}
        </div>


        {/* Progress */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="range range-xs range-primary w-full cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-bold text-base-content/40 uppercase tracking-tighter">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 group/volume">
          <button 
            onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
            className="text-base-content/40 group-hover/volume:text-primary transition-colors"
          >
            {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="range range-xs flex-1 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default GlobalMusicPlayer;
