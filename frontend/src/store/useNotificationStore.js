import { create } from "zustand";
import { getFriendRequests } from "../lib/api";

export const useNotificationStore = create((set, get) => ({
  pendingRequests: [],
  
  fetchRequests: async () => {
    try {
      const data = await getFriendRequests();
      set({ pendingRequests: data.incomingReqs || [] });
    } catch (error) {
      console.error("Error fetching friend requests", error);
    }
  },

  // Called when a new socket notification arrives
  addRequest: async (notification) => {
    // Since socket only sends ID, we re-fetch to get full sender info
    await get().fetchRequests();
  },

  // Optimized remove for instant UI feedback
  removeRequest: (requestId) => {
    set((state) => ({
      pendingRequests: state.pendingRequests.filter(r => r.id !== requestId)
    }));
  },

  getBadgeCount: () => get().pendingRequests.length,

  // Legacy unread message support (kept for compatibility if needed elsewhere)
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  resetUnread: () => set({ unreadCount: 0 }),
}));
