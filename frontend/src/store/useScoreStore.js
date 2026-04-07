import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useScoreStore = create((set, get) => ({
  scores: [],
  isLoading: false,
  isUploading: false,
  availableTags: [
    "Piano", "Jazz", "Classical", "Advanced", 
    "Theory", "Vocals", "Intermediate", "Beginner",
    "Guitar", "Violin", "Composition", "Technique"
  ],

  getScores: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get("/scores", { params: filters });
      set({ scores: response.data, isLoading: false });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch scores");
      set({ isLoading: false });
    }
  },

  createScore: async (scoreData) => {
    set({ isUploading: true });
    try {
      const response = await axiosInstance.post("/scores", scoreData);
      set((state) => ({ scores: [response.data, ...state.scores], isUploading: false }));
      toast.success("Score added to library!");
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create score");
      set({ isUploading: false });
      return null;
    }
  },

  toggleFavorite: async (scoreId) => {
    try {
      const response = await axiosInstance.post(`/scores/${scoreId}/favorite`);
      set((state) => ({
        scores: state.scores.map((s) =>
          s.id === scoreId ? { ...s, isFavorite: response.data.isFavorite } : s
        ),
      }));
      toast.success(response.data.message);
    } catch (error) {
      toast.error("Failed to update favorite status");
    }
  },

  deleteScore: async (scoreId) => {
    try {
      await axiosInstance.delete(`/scores/${scoreId}`);
      set((state) => ({
        scores: state.scores.filter((s) => s.id !== scoreId),
      }));
      toast.success("Score removed from library");
    } catch (error) {
      toast.error("Failed to delete score");
    }
  },

  getPresignedUrl: async (filename, fileType) => {
    try {
      const response = await axiosInstance.post("/scores/upload/presigned-url", {
        filename,
        fileType,
      });
      return response.data;
    } catch (error) {
      toast.error("Failed to generate upload URL");
      return null;
    }
  },

  updateScore: async (scoreId, scoreData) => {
    set({ isUploading: true });
    try {
      const response = await axiosInstance.patch(`/scores/${scoreId}`, scoreData);
      set((state) => ({
        scores: state.scores.map((s) => (s.id === scoreId ? response.data : s)),
        isUploading: false,
      }));
      toast.success("Score updated successfully!");
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update score");
      set({ isUploading: false });
      return null;
    }
  },
}));
