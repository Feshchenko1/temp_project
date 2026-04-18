import { create } from "zustand";

export const useUnreadStore = create((set, get) => ({
  unreadCounts: {}, 
  activeChatId: null,

  setUnreadCounts: (counts) => set({ unreadCounts: counts }),
  setActiveChatId: (id) => set({ activeChatId: id }),

  incrementCount: (chatId) => {
    if (get().activeChatId === chatId) return;

    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: (state.unreadCounts[chatId] || 0) + 1,
      },
    }));
  },

  clearCount: (chatId) => {
    set((state) => {
      const newCounts = { ...state.unreadCounts };
      delete newCounts[chatId];
      return { unreadCounts: newCounts };
    });
  },

  getTotalUnread: () => {
    const counts = get().unreadCounts;
    return Object.values(counts).reduce((acc, curr) => acc + curr, 0);
  },
}));
