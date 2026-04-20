import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAudioStore = create(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      volume: 0.7,
      isLooping: false,
      currentTime: 0,
      duration: 0,
      seekTo: null,

      playTrack: (score) => {
        const { currentTrack } = get();
        
        // If no score provided, do nothing
        if (!score) return;

        // If it's already the current track, just ensure it's playing
        if (currentTrack?.id === score.id) {
          set({ isPlaying: true });
          return;
        }

        // Set new track and start playing
        set({ currentTrack: score, isPlaying: true, currentTime: 0 });
      },

      togglePlayPause: () => {
        const { currentTrack } = get();
        if (!currentTrack) return;
        set((state) => ({ isPlaying: !state.isPlaying }));
      },

      setVolume: (level) => {
        const clampedLevel = Math.max(0, Math.min(1, level));
        set({ volume: clampedLevel });
      },

      toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),

      stopTrack: () => set({ currentTrack: null, isPlaying: false, currentTime: 0, duration: 0 }),

      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      triggerSeek: (time) => set({ seekTo: time }),
      resetSeek: () => set({ seekTo: null }),
    }),
    {
      name: "harmonix-audio-settings",
      partialize: (state) => ({
        volume: state.volume,
        isLooping: state.isLooping,
      }),
    }
  )
);
