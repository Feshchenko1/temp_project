import { create } from "zustand";

export const useCallStore = create((set, get) => ({
  incomingCall: null, 
  activeCall: null,   
  isInCall: false,    
  isInitiator: false, 
  ringtone: null,     
  activeChatCalls: [], // Array of chatIds that have an active call

  setActiveChatCalls: (chatIds) => set({ activeChatCalls: chatIds }),
  
  updateChatCallStatus: (chatId, isActive) => {
    set((state) => {
      const chatIds = new Set(state.activeChatCalls);
      if (isActive) {
        chatIds.add(chatId);
      } else {
        chatIds.delete(chatId);
      }
      return { activeChatCalls: Array.from(chatIds) };
    });
  },

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
          callType: incomingCall.callType || "video",
          isGroupCall: incomingCall.isGroupCall || false
        },
        incomingCall: null,
        isInitiator: false,
        ringtone: null
      });
    }
  },

  declineCall: () => {
    const { ringtone, incomingCall } = get();
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
    
    // Optimistic local cleanup
    if (incomingCall) {
      set({ 
        incomingCall: null, 
        isInCall: false, 
        ringtone: null 
      });
    }
  },

  cancelIncomingCall: (chatId) => {
    const { ringtone } = get();
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }

    // Optimistic local cleanup
    const chatIds = new Set(get().activeChatCalls);
    if (chatId) chatIds.delete(chatId);
    
    set({ 
      activeChatCalls: Array.from(chatIds),
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
    const { ringtone, activeCall } = get();
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }

    // Optimistic local cleanup
    if (activeCall) {
      const chatIds = new Set(get().activeChatCalls);
      chatIds.delete(activeCall.chatId);
      set({ activeChatCalls: Array.from(chatIds) });
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
