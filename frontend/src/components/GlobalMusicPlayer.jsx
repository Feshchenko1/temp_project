import { useState } from "react";
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, Volume2Icon, VolumeXIcon } from "lucide-react";

const GlobalMusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(30);

  const currentTrack = {
    title: "Neon Pulse",
    artist: "Synthwave Collaborative",
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=150&h=150",
    duration: "4:20",
    currentTime: "1:15"
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="mx-4 mb-4 rounded-xl bg-base-300 border border-base-content/10 overflow-hidden shadow-lg selection:bg-transparent">
      {/* Mini Album Cover / Info */}
      <div className="flex items-center gap-3 p-3 bg-base-200/50 backdrop-blur-sm border-b border-base-content/5">
        <div className="size-12 rounded-lg bg-base-100 overflow-hidden shrink-0 shadow-inner">
          <img src={currentTrack.cover} alt="Cover" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h4 className="text-sm font-bold text-base-content truncate">{currentTrack.title}</h4>
          <p className="text-xs text-base-content/60 truncate">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Controls Container */}
      <div className="p-3 bg-base-300 space-y-3">
        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          <button className="btn btn-circle btn-ghost btn-sm text-base-content/70 hover:text-primary transition-colors">
            <SkipBackIcon className="size-4" />
          </button>

          <button
            onClick={togglePlay}
            className="btn btn-circle btn-primary btn-sm shadow-md shadow-primary/20"
          >
            {isPlaying ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4 ml-0.5" />}
          </button>

          <button className="btn btn-circle btn-ghost btn-sm text-base-content/70 hover:text-primary transition-colors">
            <SkipForwardIcon className="size-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-medium text-base-content/50 px-1">
            <span>{currentTrack.currentTime}</span>
            <span>{currentTrack.duration}</span>
          </div>
          <div className="w-full h-1.5 bg-base-100 rounded-full overflow-hidden cursor-pointer relative group">
            <div
              className="absolute top-0 left-0 h-full bg-primary group-hover:bg-primary-focus transition-colors"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Volume Scrubber */}
        <div className="flex items-center gap-2 px-1 pt-1">
          <button onClick={toggleMute} className="text-base-content/60 hover:text-base-content transition-colors">
            {isMuted || volume === 0 ? <VolumeXIcon className="size-3.5" /> : <Volume2Icon className="size-3.5" />}
          </button>
          <input
            type="range"
            min={0}
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="range range-xs range-primary flex-1 opacity-80"
          />
        </div>
      </div>
    </div>
  );
};

export default GlobalMusicPlayer;
