import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("harmonix-theme") || "dark",
  setTheme: (theme) => {
    localStorage.setItem("harmonix-theme", theme);
    set({ theme });
  },
}));
