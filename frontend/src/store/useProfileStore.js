import { create } from "zustand";

export const useProfileStore = create((set) => ({
  selectedProfile: null,
  isOpen: false,
  openProfile: (profile) => set({ selectedProfile: profile, isOpen: true }),
  closeProfile: () => set({ selectedProfile: null, isOpen: false }),
}));
