import { create } from "zustand";

/**
 * useCallStore - Centralized state for Harmonix Live Studio (Video/Audio Calls)
 * Handles incoming call modals, active call sessions, and audio notifications.
 */

export const useCallStore = create((set, get) => ({
  // State
  incomingCall: null, // { fromUserId, callerName, chatId, callType }
  activeCall: null,   // { targetUserId, targetName, chatId, callType }
  isInCall: false,    // True if in call modal or active call
  isInitiator: false, // True if we started the call
  ringtone: null,     // Audio instance

  // Setters/Actions
  setIncomingCall: (call) => {
    // If already in a call, ignore (handled at socket layer)
    if (get().isInCall) return;

    // Initialize and start ringtone (Professional Audio Implementation)
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(() => {});

    set({ 
      incomingCall: call, 
      isInCall: true, // We are "in a call" (busy) once modal shows up
      ringtone: audio 
    });
  },

  acceptCall: () => {
    const { incomingCall, ringtone } = get();
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }

    if (incomingCall) {
      set({
        activeCall: {
          targetUserId: incomingCall.fromUserId,
          targetName: incomingCall.callerName,
          chatId: incomingCall.chatId,
          callType: incomingCall.callType || "video"
        },
        incomingCall: null,
        isInitiator: false,
        ringtone: null
      });
    }
  },

  declineCall: () => {
    const { ringtone } = get();
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
    set({ 
      incomingCall: null, 
      isInCall: false, 
      ringtone: null 
    });
  },

  cancelIncomingCall: () => {
    // Called when the caller cancels BEFORE we pick up
    const { ringtone } = get();
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
    set({ 
      incomingCall: null, 
      isInCall: false, 
      ringtone: null 
    });
  },

  initiateCall: (target) => {
    // target: { targetUserId, targetName, chatId, callType }
    set({ 
      activeCall: target, 
      isInCall: true, 
      isInitiator: true 
    });
  },

  endCall: () => {
    const { ringtone } = get();
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
    set({ 
      activeCall: null, 
      incomingCall: null, 
      isInCall: false, 
      isInitiator: false,
      ringtone: null 
    });
  }
}));
