import { create } from "zustand";

export const useLayoutStore = create((set) => ({
  isSidebarCollapsed: false,
  onlineUserIds: [],
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),
}));
