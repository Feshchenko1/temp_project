import React, { useState } from "react";
import VideoCallOverlay from "../components/VideoCallOverlay";
import { PhoneCall } from "lucide-react";

const CallPage = () => {
  const [isInCall, setIsInCall] = useState(false);

  return (
    <div className="h-[93vh] flex items-center justify-center bg-base-200">
      <div className="text-center space-y-6 max-w-md p-8 bg-base-100 rounded-2xl shadow-xl border border-white/5 animate-in slide-in-from-bottom-5 duration-500">
        <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(var(--p),0.3)]">
          <PhoneCall size={32} />
        </div>
        <h2 className="text-3xl font-bold">Harmonix Live</h2>
        <p className="opacity-70 text-sm">
          Initiate a direct, peer-to-peer WebRTC connection. Audio and Video streams bypass the server directly to the peer.
        </p>
        <button 
          onClick={() => setIsInCall(true)}
          className="btn btn-primary w-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(var(--p),0.3)]"
        >
          Start Secure Session
        </button>

        {isInCall && (
          <VideoCallOverlay 
            chatId="webrtc-demo-session" 
            currentUserId="mock-user-1"
            onEndCall={() => setIsInCall(false)} 
          />
        )}
      </div>
    </div>
  );
};
export default CallPage;
