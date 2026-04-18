import { Phone, PhoneOff, User } from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import { getSocket } from "../lib/socketClient";

/**
 * IncomingCallModal - A premium, full-screen immersive modal for call invites.
 * Uses glassmorphism and backdrop blur for a high-end studio feel.
 */
const IncomingCallModal = () => {
  const { incomingCall, declineCall, acceptCall } = useCallStore();

  if (!incomingCall) return null;

  const handleDecline = () => {
    const socket = getSocket();
    socket.emit("call:response", {
      targetUserId: incomingCall.fromUserId,
      accepted: false,
      chatId: incomingCall.chatId
    });
    declineCall();
  };

  const handleAccept = () => {
    const socket = getSocket();
    socket.emit("call:response", {
      targetUserId: incomingCall.fromUserId,
      accepted: true,
      chatId: incomingCall.chatId
    });
    acceptCall();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-2xl transition-all duration-500">
      <div className="relative w-full max-w-sm p-10 text-center animate-in zoom-in-95 fade-in duration-300">
        {/* Animated Rings Background */}
        <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none">
          <div className="w-64 h-64 rounded-full border border-white/5 animate-ping duration-[3s]" />
          <div className="absolute w-48 h-48 rounded-full border border-white/10 animate-ping duration-[2s]" />
        </div>

        <div className="mb-8 flex justify-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/20 flex items-center justify-center shadow-2xl">
              <User size={56} className="text-white/90" />
              {/* Status Indicator */}
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#1a1a1a] animate-pulse" />
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-10">
          <h2 className="text-3xl font-bold text-white tracking-tight">Incoming Call</h2>
          <p className="text-white/50 text-base font-medium">
            <span className="text-blue-400 font-bold">{incomingCall.callerName}</span> wants to jam with you
          </p>
        </div>

        <div className="flex items-center justify-center gap-10">
          <button
            onClick={handleDecline}
            className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
          >
            <div className="w-18 h-18 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 transition-all duration-300 group-hover:bg-red-500 group-hover:text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <PhoneOff size={32} />
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Decline</span>
          </button>

          <button
            onClick={handleAccept}
            className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
          >
            <div className="w-18 h-18 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 transition-all duration-300 group-hover:bg-emerald-500 group-hover:text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Phone size={32} />
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
