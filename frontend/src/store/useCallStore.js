import { create } from "zustand";

export const useCallStore = create((set, get) => ({
  incomingCall: null, 
  activeCall: null,   
  isInCall: false,    
  isInitiator: false, 
  ringtone: null,     

  setIncomingCall: (call) => {
    if (get().isInCall) return;
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(() => {});

    set({ 
      incomingCall: call, 
      isInCall: true, 
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
