import { useEffect, useRef } from "react";
import { useAudioStore } from "../store/useAudioStore";

/**
 * Headless Audio Engine
 * This component is invisible and manages the actual HTML5 <audio> element.
 * It stays mounted at the layout level to prevent playback interruption during UI transitions.
 */
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

  // 1. Sync playback state (Play/Pause)
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

  // 2. Sync Properties (Volume, Loop)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.loop = loopMode === 2; // Native loop only for single track repeat
    }
  }, [volume, loopMode, currentTrack]);

  // 3. Handle External Seek Commands
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
      key={currentTrack.audioUrl || currentTrack.fileUrl} // Use URL as key to reset audio element on source change
      src={currentTrack.audioUrl || currentTrack.fileUrl}
      onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
      onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      onEnded={() => playNext()} // Let playNext handle the transition logic
      className="hidden"
      aria-hidden="true"
    />
  );
};

export default AudioEngine;
