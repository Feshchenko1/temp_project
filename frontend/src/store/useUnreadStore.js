import { create } from "zustand";

export const useUnreadStore = create((set, get) => ({
  unreadCounts: {}, 
  activeChatId: null,

  setUnreadCounts: (counts) => {
    const formatted = {};
    for (const [id, value] of Object.entries(counts)) {
      if (typeof value === "number") {
         formatted[id] = { count: value, isMuted: false };
      } else {
         formatted[id] = value;
      }
    }
    set({ unreadCounts: formatted });
  },
  setActiveChatId: (id) => set({ activeChatId: id }),

  incrementCount: (chatId) => {
    if (get().activeChatId === chatId) return;

    set((state) => {
      const current = state.unreadCounts[chatId] || { count: 0, isMuted: false };
      return {
        unreadCounts: {
          ...state.unreadCounts,
          [chatId]: {
            ...current,
            count: current.count + 1,
          },
        },
      };
    });
  },

  clearCount: (chatId) => {
    set((state) => {
      const current = state.unreadCounts[chatId];
      if (!current) return state;
      return {
        unreadCounts: {
          ...state.unreadCounts,
          [chatId]: {
            ...current,
            count: 0
          }
        }
      };
    });
  },
  
  toggleMuteOptimistic: (chatId) => {
    set((state) => {
      const current = state.unreadCounts[chatId] || { count: 0, isMuted: false };
      return {
        unreadCounts: {
          ...state.unreadCounts,
          [chatId]: {
            ...current,
            isMuted: !current.isMuted
          }
        }
      }
    });
  },
  
  removeChatOptimistic: (chatId) => {
    set((state) => {
       const newCounts = { ...state.unreadCounts };
       delete newCounts[chatId];
       return { unreadCounts: newCounts };
    });
  },

  getTotalUnread: () => {
    const counts = get().unreadCounts;
    return Object.values(counts).reduce((acc, curr) => {
      const count = typeof curr === "number" ? curr : (curr?.count || 0);
      const isMuted = curr?.isMuted || false;
      if (!isMuted) {
        return acc + count;
      }
      return acc;
    }, 0);
  },

}));
