import { useEffect, useRef } from "react";
import { useAudioStore } from "../store/useAudioStore";

const AudioEngine = () => {
  const {
    currentTrack,
    isPlaying,
    volume,
    loopMode,
    seekTo,
    setCurrentTime,
    setDuration,
    playNext,
    resetSeek
  } = useAudioStore();

  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Playback prevented or failed:", error);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.loop = loopMode === 2;
    }
  }, [volume, loopMode, currentTrack]);

  useEffect(() => {
    if (seekTo !== null && audioRef.current) {
      audioRef.current.currentTime = seekTo;
      resetSeek();
    }
  }, [seekTo, resetSeek]);

  if (!currentTrack) return null;

  return (
    <audio
      ref={audioRef}
      key={currentTrack.audioUrl || currentTrack.fileUrl}
      src={currentTrack.audioUrl || currentTrack.fileUrl}
      onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
      onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      onEnded={() => playNext()}
      className="hidden"
      aria-hidden="true"
    />
  );
};

export default AudioEngine;
