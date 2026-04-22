import { create } from "zustand";
import { getFriendRequests } from "../lib/api";

export const useNotificationStore = create((set, get) => ({
  pendingRequests: [],
  lastActionTimestamp: 0,
  
  fetchRequests: async () => {
    const now = Date.now();
    if (now - get().lastActionTimestamp < 2000) {
      return;
    }

    try {
      const data = await getFriendRequests();
      const newReqs = data.incomingReqs || [];
      
      set((state) => {
        if (state.pendingRequests.length !== newReqs.length) {
          return { pendingRequests: newReqs };
        }
        return state;
      });
    } catch (error) {
      console.error("Failed to fetch notification count", error);
    }
  },

  addRequest: async (notification) => {
    await get().fetchRequests();
  },

  removeRequest: (requestId) => {
    set((state) => ({
      pendingRequests: state.pendingRequests.filter(r => String(r.id) !== String(requestId)),
      lastActionTimestamp: Date.now()
    }));
  },

  getBadgeCount: () => get().pendingRequests.length,

}));
