import { create } from "zustand";

export const useModalStore = create((set) => ({
  isUploadTrackModalOpen: false,
  isScoreFormModalOpen: false,
  isCreateGroupModalOpen: false,
  isEditTrackModalOpen: false,
  isCreatePlaylistModalOpen: false,
  isAddToPlaylistModalOpen: false,
  
  selectedScore: null,
  selectedTrack: null,
  trackToAdd: null,
  
  openUploadTrackModal: () => set({ isUploadTrackModalOpen: true }),
  closeUploadTrackModal: () => set({ isUploadTrackModalOpen: false }),
  
  openScoreFormModal: (score = null) => set({ 
    isScoreFormModalOpen: true,
    selectedScore: score
  }),
  closeScoreFormModal: () => set({ 
    isScoreFormModalOpen: false,
    selectedScore: null
  }),
  
  openCreateGroupModal: () => set({ isCreateGroupModalOpen: true }),
  closeCreateGroupModal: () => set({ isCreateGroupModalOpen: false }),

  openEditTrackModal: (track) => set({ 
    isEditTrackModalOpen: true,
    selectedTrack: track
  }),
  closeEditTrackModal: () => set({ 
    isEditTrackModalOpen: false,
    selectedTrack: null
  }),

  openCreatePlaylistModal: () => set({ isCreatePlaylistModalOpen: true }),
  closeCreatePlaylistModal: () => set({ isCreatePlaylistModalOpen: false }),

  openAddToPlaylistModal: (track) => set({ 
    isAddToPlaylistModalOpen: true,
    trackToAdd: track
  }),
  closeAddToPlaylistModal: () => set({ 
    isAddToPlaylistModalOpen: false,
    trackToAdd: null
  }),

  closeAllModals: () => set({
    isUploadTrackModalOpen: false,
    isScoreFormModalOpen: false,
    isCreateGroupModalOpen: false,
    isEditTrackModalOpen: false,
    isCreatePlaylistModalOpen: false,
    isAddToPlaylistModalOpen: false,
    selectedScore: null,
    selectedTrack: null,
    trackToAdd: null,
  })
}));
