import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAudioStore = create(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      volume: 0.7,
      loopMode: 0, 
      isShuffled: false,
      currentTime: 0,
      duration: 0,
      seekTo: null,
      
      queue: [],
      originalQueue: [],
      currentIndex: -1,
      contextId: null,

      playContext: (tracks, startIndex = 0, contextId = null) => {
        if (!tracks || tracks.length === 0) return;
        
        const track = tracks[startIndex];
        set({ 
          queue: tracks, 
          originalQueue: tracks, 
          currentIndex: startIndex, 
          currentTrack: track, 
          contextId, 
          isPlaying: true, 
          currentTime: 0 
        });
      },

      playTrack: (score) => {
        const { currentTrack, isPlaying } = get();
        
        if (!score) return;

        if (currentTrack?.id === score.id) {
          set({ isPlaying: true });
          return;
        }
        get().playContext([score], 0, "single");
      },

      playNext: () => {
        const { queue, currentIndex, loopMode } = get();
        if (queue.length === 0) return;
        
        let nextIndex = currentIndex + 1;
        
        if (nextIndex >= queue.length) {
          if (loopMode === 1) {
            nextIndex = 0; 
          } else {
            get().stopTrack(); 
            return;
          }
        }
        
        set({ 
          currentIndex: nextIndex, 
          currentTrack: queue[nextIndex], 
          isPlaying: true, 
          currentTime: 0 
        });
      },

      playPrev: () => {
        const { queue, currentIndex, currentTime } = get();
        if (queue.length === 0) return;
        
        if (currentTime > 3) {
          set({ seekTo: 0, currentTime: 0 });
          return;
        }
        
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        set({ 
          currentIndex: prevIndex, 
          currentTrack: queue[prevIndex], 
          isPlaying: true, 
          currentTime: 0 
        });
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

      toggleLoopMode: () => {
        set((state) => ({ loopMode: (state.loopMode + 1) % 3 }));
      },

      toggleShuffle: () => {
        set((state) => ({ isShuffled: !state.isShuffled }));
      },

      stopTrack: () => set({ 
        currentTrack: null, 
        isPlaying: false, 
        currentTime: 0, 
        duration: 0,
        queue: [],
        currentIndex: -1,
        contextId: null
      }),

      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      triggerSeek: (time) => set({ seekTo: time }),
      resetSeek: () => set({ seekTo: null }),
    }),
    {
      name: "harmonix-audio-settings",
      partialize: (state) => ({
        volume: state.volume,
        loopMode: state.loopMode,
        isShuffled: state.isShuffled,
      }),
    }
  )
);
