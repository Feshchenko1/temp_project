import React, { useState, useEffect, useRef } from "react";
import { Video, Mic, MicOff, VideoOff, PhoneOff, CloudUpload, Maximize, ShieldAlert } from "lucide-react";
import { connectSocket } from "../lib/socketClient";
import toast from "react-hot-toast";

import { useCallStore } from "../store/useCallStore";

const VideoCallOverlay = ({ chatId, targetUserId, currentUserId, onEndCall }) => {
  const { activeCall, isInitiator } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreensharing, setIsScreensharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("initializing");

  // MediaRecorder states
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSize, setRecordedSize] = useState(0);
  const [isRemoteFit, setIsRemoteFit] = useState(false); // false = cover (FILL), true = contain (FIT)

  const socket = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const displayStreamRef = useRef(null);
  const screenStreamRef = useRef(null);


  // Rule: Use mutable ref for call data to prevent React lifecycle teardown loops
  const callDataRef = useRef({ chatId, targetUserId, isInitiator, currentUserId });
  useEffect(() => {
    callDataRef.current = { chatId, targetUserId, isInitiator, currentUserId };
  }, [chatId, targetUserId, isInitiator, currentUserId]);

  useEffect(() => {
    let isMounted = true;
    console.log("[WebRTC] Initializing with Target:", targetUserId, "Current:", currentUserId);
    
    // 1. Synchronous Initialization
    socket.current = connectSocket();
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    console.log("[WebRTC] Synchronously Instantiating PeerConnection...");
    peerConnection.current = new RTCPeerConnection(configuration);

    // 2. Readiness Promise Architecture
    let resolveMediaReady;
    const mediaReadyPromise = new Promise((res) => {
      resolveMediaReady = res;
    });

    // 3. Immediate Event Binding
    peerConnection.current.ontrack = (event) => {
      console.log("[WebRTC] Received remote track:", event.track.kind);
      if (!remoteVideoRef.current) return;

      // Use the bundled stream if available (Best Practice)
      if (event.streams && event.streams.length > 0) {
        remoteVideoRef.current.srcObject = event.streams[0];
      } else {
        // Fallback: Re-assign to force DOM repaint
        let stream = remoteVideoRef.current.srcObject;
        if (!stream) stream = new MediaStream();
        stream.addTrack(event.track);
        remoteVideoRef.current.srcObject = stream; 
      }

      // Crucial: Force playback when metadata hits
      remoteVideoRef.current.onloadedmetadata = () => {
        remoteVideoRef.current.play().catch(e => console.warn("WebRTC Play error:", e));
      };
      setConnectionStatus("connected");
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && socket.current) {
        console.log("[WebRTC] Sending ICE Candidate to:", callDataRef.current.targetUserId);
        socket.current.emit("webrtc-ice-candidate", {
          targetUserId: String(callDataRef.current.targetUserId),
          fromUserId: String(callDataRef.current.currentUserId),
          candidate: event.candidate,
          chatId: callDataRef.current.chatId
        });
      }
    };

    peerConnection.current.onconnectionstatechange = () => {
      if (peerConnection.current) {
        console.log("[WebRTC] Connection State Changed:", peerConnection.current.connectionState);
        setConnectionStatus(peerConnection.current.connectionState);
      }
    };

    const startMedia = async () => {
      try {
        console.log("[WebRTC] Requesting Local Media...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;



        // Inject tracks into PeerConnection with stream references (Rule C)
        console.log("[WebRTC] Injecting tracks into PeerConnection...");
        stream.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, stream);
        });

        // SIGNAL READINESS
        resolveMediaReady();
        console.log("[WebRTC] Local Media Ready & Injected.");
      } catch (err) {
        toast.error("Could not access camera/mic.");
        console.error("[WebRTC] Failed to access media devices", err);
      }
    };

    startMedia();

    // 4. Signaling Listeners with Readiness Await
    socket.current.on("call:response", (data) => {
      if (String(data.fromUserId) !== String(callDataRef.current.targetUserId)) return;

      if (data.accepted) {
        if (callDataRef.current.isInitiator) {
          console.log("[WebRTC] Peer accepted! Preparing Offer...");
          setTimeout(() => {
            if (isMounted) initiateOffer();
          }, 800);
        }
      } else if (!data.accepted && callDataRef.current.isInitiator) {
        toast.error(data.reason === "busy" ? "User is busy" : "Call declined");
        onEndCall();
      }
    });

    socket.current.on("webrtc-offer", async (data) => {
      if (String(data.fromUserId) !== String(callDataRef.current.targetUserId)) return;
      
      try {
        // CRITICAL: Wait for local tracks to be ready before creating Answer
        console.log("[WebRTC] Offer received, awaiting media readiness...");
        await mediaReadyPromise;
        console.log("[WebRTC] Media ready, processing offer.");

        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        
        socket.current.emit("webrtc-answer", {
          targetUserId: String(data.fromUserId),
          fromUserId: String(callDataRef.current.currentUserId),
          answer,
          chatId: callDataRef.current.chatId
        });
      } catch (err) {
        console.error("[WebRTC] Error handling offer", err);
      }
    });

    socket.current.on("webrtc-answer", async (data) => {
      if (String(data.fromUserId) !== String(callDataRef.current.targetUserId)) return;
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (err) {
        console.error("[WebRTC] Error handling answer", err);
      }
    });

    socket.current.on("webrtc-ice-candidate", async (data) => {
      if (String(data.fromUserId) !== String(callDataRef.current.targetUserId)) return;
      try {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error("[WebRTC] Error adding ICE candidate", err);
      }
    });

    const initiateOffer = async () => {
      if (!peerConnection.current) return;
      try {
        await mediaReadyPromise; // Also ensure ready before offering
        console.log("[WebRTC] Creating Offer...");
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.current.emit("webrtc-offer", {
          targetUserId: String(callDataRef.current.targetUserId),
          fromUserId: String(callDataRef.current.currentUserId),
          offer,
          chatId: callDataRef.current.chatId
        });
      } catch (err) {
        console.error("[WebRTC] Error initiating offer", err);
      }
    };

    return () => {
      isMounted = false;
      console.log("[WebRTC] Cleaning up Call Overlay...");
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      socket.current?.off("call:response");
      socket.current?.off("webrtc-offer");
      socket.current?.off("webrtc-answer");
      socket.current?.off("webrtc-ice-candidate");
    };
  }, []);



  const handleStartRecording = async () => {
    // 1. UX Guard: Instruct the user before the prompt appears
    toast("Please select 'This Tab' and check 'Share Tab Audio' in the prompt.", {
      icon: "🎬",
      duration: 5000,
    });

    try {
      // 2. Request Tab Capture with modern hints
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
        preferCurrentTab: true, // Hints Chrome/Edge to select current tab
        surfaceSwitching: "exclude" // Prevents changing tabs while recording
      });
      displayStreamRef.current = displayStream; // Save for explicit cleanup

      // 3. Setup Audio Mixing (Tab Audio + Local Mic)
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();

      // Add Tab Audio (The remote peer's voice + UI sound)
      if (displayStream.getAudioTracks().length > 0) {
        audioCtx.createMediaStreamSource(displayStream).connect(dest);
      }

      // Add Local Mic Audio
      const localMicTrack = localStream.current?.getAudioTracks()[0];
      if (localMicTrack) {
        const micStream = new MediaStream([localMicTrack]);
        audioCtx.createMediaStreamSource(micStream).connect(dest);
      }

      // 4. Create Composite Stream
      const compositeStream = new MediaStream([
        displayStream.getVideoTracks()[0],
        dest.stream.getAudioTracks()[0] // Mixed audio
      ]);

      // 5. Initialize MediaRecorder
      const options = { mimeType: "video/webm; codecs=vp9" };
      mediaRecorderRef.current = new MediaRecorder(compositeStream, options);
      chunksRef.current = [];
      setRecordedSize(0);
      setIsRecording(true);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          setRecordedSize(prev => prev + event.data.size);
        }
      };

      // Stop recording automatically if user stops sharing the tab natively
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state !== "inactive") {
          handleStopRecording();
        }
      };

      mediaRecorderRef.current.start(1000);
    } catch (err) {
      console.error("Tab recording failed/cancelled:", err);
      toast.error("Recording cancelled.");
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    // NEW: explicitly stop the browser tab capture to remove the native banner
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach(track => track.stop());
      displayStreamRef.current = null;
    }

    setTimeout(async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const TWO_GB = 2 * 1024 * 1024 * 1024;

      if (blob.size < TWO_GB) {
        // PRO FEATURE: Direct Cloud Bypass for Session Recordings
        try {
          const file = new File([blob], `Session_${Date.now()}.webm`, { type: "video/webm" });
          const { fileUrl, originalName } = await import("../lib/api").then(m => m.uploadFileDirectly(file));

          const messagePayload = {
            chatId,
            text: "🎬 Collaboration session recorded.",
            fileUrl,
            fileName: originalName
          };

          // Emit to chat room so peers see the recording instantly
          socket.current.emit("send_message", messagePayload);

          console.log("Session recording uploaded successfully:", fileUrl);
        } catch (err) {
          console.error("Auto-upload failed. Fallback to local.", err);
        }
      } else {
        // Option B: Raspberry Pi safety fallback (Direct browser hard drive dump)
        console.log("Blob > 2GB: Hardware constraint triggered, forcing local download.");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `Harmonix_Collaboration_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 500);
  };

  const toggleScreenshare = async () => {
    try {
      if (!isScreensharing) {
        console.log("[MediaRecorder] Requesting Display Media...");
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        screenStreamRef.current = screenStream; // Save for explicit cleanup
        const screenTrack = screenStream.getVideoTracks()[0];



        if (peerConnection.current) {
          const sender = peerConnection.current.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreensharing(true);

        screenTrack.onended = () => {
          console.log("[MediaRecorder] Screen Track Ended by User Interaction.");
          stopScreenshare();
        };
      } else {
        stopScreenshare();
      }
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        toast.error("Screenshare error.");
        console.error("[MediaRecorder] Screenshare error:", err);
      }
    }
  };

  const stopScreenshare = () => {
    try {


      // Also remember to replace the track on the WebRTC sender!
      if (peerConnection.current && localStream.current) {
        const sender = peerConnection.current.getSenders().find(s => s.track?.kind === "video");
        const cameraTrack = localStream.current.getVideoTracks()[0];
        if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
      }

      if (localVideoRef.current && localStream.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
      setIsScreensharing(false);

      // NEW: Explicitly stop the screenshare tracks to dismiss the native banner
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
    } catch (err) {
      console.error("Error reverting to camera:", err);
    }
  };

  const toggleMute = () => {
    const src = localVideoRef.current?.srcObject;
    if (src) {
      src.getAudioTracks().forEach((track) => (track.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    const src = localStream.current;
    if (src) {
      src.getVideoTracks().forEach((track) => (track.enabled = isVideoOff));
      setIsVideoOff(!isVideoOff);
    }
  };

  const requestFullscreen = (element) => {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center text-white mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          Harmonix Live Studio
        </h2>
        {isRecording && (
          <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-sm font-semibold border border-red-500/50">
            REC: {(recordedSize / 1e6).toFixed(1)} MB
          </span>
        )}
      </div>

      {/* Videos Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        <div className="bg-base-300 rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl group">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full ${isScreensharing ? "object-contain" : "object-cover transform -scale-x-100"}`}
          />
          <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 text-xs rounded shadow backdrop-blur-sm text-white">
            You {isMuted && "(Muted)"} {isScreensharing && "(Screen)"}
          </div>
          <button
            onClick={() => requestFullscreen(localVideoRef.current)}
            className="absolute top-4 right-4 bg-black/40 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize size={16} />
          </button>
        </div>
        <div className="bg-base-300 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden relative group">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full transition-all duration-300 ${isRemoteFit ? "object-contain bg-black" : "object-cover"}`}
          />

          {(connectionStatus !== "connected") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
              <div className="flex flex-col items-center animate-pulse">
                <span className="loading loading-infinity loading-lg text-primary scale-150 mb-6"></span>
                <p className="font-mono text-sm text-white/70 uppercase tracking-widest">
                  {connectionStatus === "initializing" ? "Setting up Signal..." : "Linking with Peer..."}
                </p>
                <p className="text-[10px] text-white/30 mt-2">Harmonix P2P v2.4</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsRemoteFit(!isRemoteFit)}
            className="absolute top-4 right-16 bg-black/40 px-3 py-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold tracking-wider backdrop-blur-sm"
          >
            {isRemoteFit ? "FILL" : "FIT"}
          </button>

          <button
            onClick={() => requestFullscreen(remoteVideoRef.current)}
            className="absolute top-4 right-4 bg-black/40 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>

      {/* Constraints Dashboard / Controls */}
      <div className="mt-8 flex justify-center items-center gap-6">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button
          onClick={toggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
          title="Toggle Video"
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>

        <button
          onClick={toggleScreenshare}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isScreensharing ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
          title={isScreensharing ? "Stop Screenshare" : "Share Screen"}
        >
          <CloudUpload size={24} />
        </button>

        <div className="w-[1px] h-10 bg-white/10 mx-2" />

        {isRecording ? (
          <button
            onClick={handleStopRecording}
            className="h-14 px-8 rounded-full bg-red-500 text-white font-black uppercase tracking-widest text-xs animate-pulse shadow-xl shadow-red-500/40 hover:scale-105 active:scale-95 transition-all"
          >
            Stop REC
          </button>
        ) : (
          <button
            onClick={handleStartRecording}
            className="h-14 px-8 rounded-full bg-white/10 text-white font-black uppercase tracking-widest text-xs border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            Record Session
          </button>
        )}

        <button
          onClick={onEndCall}
          className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95 transition-all ml-4"
        >
          <PhoneOff size={28} />
        </button>
      </div>

      <div className="absolute bottom-6 right-8 flex items-center gap-3 opacity-30 select-none">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase tracking-widest">P2P Encrypted</span>
          <span className="text-[8px] font-mono">Session ID: {chatId.substring(0, 8)}...</span>
        </div>
        <div className="w-8 h-8 rounded-lg border border-white flex items-center justify-center">
          <ShieldAlert size={14} />
        </div>
      </div>
    </div>
  );
};

export default VideoCallOverlay;
