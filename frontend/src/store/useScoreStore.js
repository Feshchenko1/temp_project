import { create } from "zustand";

export const useScoreStore = create(() => ({
  availableTags: [
    "Piano", "Jazz", "Classical", "Advanced",
    "Theory", "Vocals", "Intermediate", "Beginner",
    "Guitar", "Violin", "Composition", "Technique"
  ],
}));
