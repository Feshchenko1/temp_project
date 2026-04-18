import { create } from "zustand";
import { getFriendRequests } from "../lib/api";

export const useNotificationStore = create((set, get) => ({
  pendingRequests: [],
  
  fetchRequests: async () => {
    try {
      const data = await getFriendRequests();
      set({ pendingRequests: data.incomingReqs || [] });
    } catch (error) {
    }
  },

  addRequest: async (notification) => {
    await get().fetchRequests();
  },

  removeRequest: (requestId) => {
    set((state) => ({
      pendingRequests: state.pendingRequests.filter(r => r.id !== requestId)
    }));
  },

  getBadgeCount: () => get().pendingRequests.length,

  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  resetUnread: () => set({ unreadCount: 0 }),
}));
