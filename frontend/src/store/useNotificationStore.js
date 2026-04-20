import { create } from "zustand";
import { getFriendRequests } from "../lib/api";

export const useNotificationStore = create((set, get) => ({
  pendingRequests: [],
  lastActionTimestamp: 0,
  
  fetchRequests: async () => {
    // SILENCE PERIOD: Ignore fetches within 2s of a manual action to prevent stale database state "echoes"
    const now = Date.now();
    if (now - get().lastActionTimestamp < 2000) {
      // console.log("Notification fetch silenced to prevent ghost badge");
      return;
    }

    try {
      const data = await getFriendRequests();
      const newReqs = data.incomingReqs || [];
      
      // Only update if the count has changed to prevent stale overwrites from React Query history
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

  // removeRequest is used for immediate optimistic feedback on badges
  removeRequest: (requestId) => {
    set((state) => ({
      pendingRequests: state.pendingRequests.filter(r => String(r.id) !== String(requestId)),
      lastActionTimestamp: Date.now() // Trigger silence period
    }));
  },

  getBadgeCount: () => get().pendingRequests.length,

}));
