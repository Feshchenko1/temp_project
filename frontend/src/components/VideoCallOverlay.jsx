import React, { useState, useEffect, useRef, memo } from "react";
import { Video, Mic, MicOff, VideoOff, PhoneOff, CloudUpload, Maximize, Minimize2, ShieldAlert, Volume2, VolumeX, PictureInPicture } from "lucide-react";
import { connectSocket } from "../lib/socketClient";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

import { useCallStore } from "../store/useCallStore";
import { getSessionKey, encryptMessage } from "../lib/crypto";

/**
 * LocalVideo: Memoized sub-component to prevent flickering on parent re-renders.
 * Uses useEffect to attach srcObject only when the stream reference changes.
 * Now targets container for fullscreen to keep our UI visible.
 */
const LocalVideo = memo(({ stream, isScreensharing }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFit, setIsFit] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      await document.exitFullscreen().catch(err => console.error(err));
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement !== videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (err) {
      console.error("Local PiP failed:", err);
    }
  };

  const toggleFit = () => setIsFit(!isFit);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full rounded-2xl overflow-hidden bg-base-300 border border-white/5 flex items-center justify-center group"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-center transition-all duration-300 ${isFit ? "object-contain bg-black" : "object-cover transform -scale-x-100"}`}
      />
      
      {/* Label Badge */}
      <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 text-xs rounded shadow backdrop-blur-sm text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        You {isScreensharing && "(Screen)"}
      </div>

      {/* Local Toolbar (FIT, PiP, Fullscreen) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-[-4px] group-hover:translate-y-0 z-10">
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-2xl">
          {/* Fit Mode Toggle */}
          <button
            onClick={toggleFit}
            className="px-3 py-1.5 rounded-lg text-white hover:bg-white/10 transition-colors text-[10px] font-black tracking-widest uppercase"
            title={isFit ? "Fill Screen" : "Fit to Screen"}
          >
            {isFit ? "FILL" : "FIT"}
          </button>
          
          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          <button 
            onClick={togglePiP} 
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors" 
            title="Picture in Picture"
          >
            <PictureInPicture size={16} />
          </button>
          <button 
            onClick={toggleFullscreen} 
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors" 
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
});

/**
 * RemoteVideo: Memoized sub-component for remote peer streams.
 * Ensures srcObject attachment is stable and isolated from parent re-renders.
 * Now includes local controls (PiP, Mute, Fullscreen) for a custom studio experience.
 */
const RemoteVideo = memo(({ stream, userId, fitMode, resolveName, toggleFitMode }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isLocallyMuted, setIsLocallyMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Sync fullscreen state with browser events (e.g. if user presses Esc)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      await document.exitFullscreen().catch(err => console.error(err));
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement !== videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (err) {
      console.error("PiP failed:", err);
    }
  };

  const toggleLocalMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isLocallyMuted;
      setIsLocallyMuted(!isLocallyMuted);
    }
  };

  const isContain = fitMode === "contain";

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full rounded-2xl overflow-hidden bg-base-300 border border-white/5 flex items-center justify-center group"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full transition-all duration-300 ${isContain ? "object-contain bg-black/40" : "object-cover object-center"}`}
      />
      
      {/* Name Badge */}
      <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 text-xs rounded shadow backdrop-blur-sm text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        {resolveName(userId)}
        {isLocallyMuted && <VolumeX size={12} className="text-error" />}
      </div>
      
      {/* Custom Control Bar (Google Meet Style) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-[-4px] group-hover:translate-y-0">
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-2xl">
          {/* Fit Mode Toggle */}
          <button
            onClick={() => toggleFitMode(userId)}
            className="px-2 py-1.5 rounded-lg text-white hover:bg-white/10 transition-colors text-[10px] font-black tracking-widest uppercase"
            title={isContain ? "Fill Screen" : "Fit to Screen"}
          >
            {isContain ? "FILL" : "FIT"}
          </button>
          
          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Local Mute */}
          <button
            onClick={toggleLocalMute}
            className={`p-2 rounded-lg transition-colors ${isLocallyMuted ? "text-error bg-error/10" : "text-white hover:bg-white/10"}`}
            title={isLocallyMuted ? "Unmute locally" : "Mute locally"}
          >
            {isLocallyMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* PiP */}
          <button
            onClick={togglePiP}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            title="Picture-in-Picture"
          >
            <PictureInPicture size={16} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
});


const VideoCallOverlay = ({ chatId, targetUserId, targetName, currentUserId, onEndCall }) => {
  const { isInitiator } = useCallStore();


  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreensharing, setIsScreensharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("initializing");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSize, setRecordedSize] = useState(0);

  const socket = useRef(null);
  const peerConnections = useRef(new Map()); // Map<userId, RTCPeerConnection>
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // Map<userId, MediaStream>
  const [fitModes, setFitModes] = useState({}); // Map<userId, 'cover' | 'contain'>
  const queryClient = useQueryClient();

  const localStream = useRef(null);
  const displayStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const wasEstablishedRef = useRef(false);

  const callDataRef = useRef({ chatId, targetUserId, isInitiator, currentUserId });
  useEffect(() => {
    callDataRef.current = { chatId, targetUserId, isInitiator, currentUserId };
  }, [chatId, targetUserId, isInitiator, currentUserId]);

  const createPeerConnection = (targetUserId, stream) => {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    const pc = new RTCPeerConnection(configuration);

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        if (event.streams && event.streams.length > 0) {
          next.set(targetUserId, event.streams[0]);
        } else {
          let currentStream = next.get(targetUserId) || new MediaStream();
          currentStream.addTrack(event.track);
          next.set(targetUserId, currentStream);
        }
        return next;
      });
      setConnectionStatus("connected");
      wasEstablishedRef.current = true;
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.current) {
        socket.current.emit("webrtc-ice-candidate", {
          targetUserId: String(targetUserId),
          candidate: event.candidate,
          chatId: callDataRef.current.chatId,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        handlePeerDisconnect(targetUserId);
      }
    };

    // Add local tracks
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    peerConnections.current.set(targetUserId, pc);
    return pc;
  };

  const handlePeerDisconnect = (userId) => {
    const pc = peerConnections.current.get(userId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(userId);
    }
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
    setFitModes((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const toggleFitMode = React.useCallback((peerId) => {
    setFitModes(prev => ({
      ...prev,
      [peerId]: prev[peerId] === "contain" ? "cover" : "contain"
    }));
  }, []);

  const resolvePeerName = React.useCallback((peerId) => {
    const recentChats = queryClient.getQueryData(["recent-chats"]) || [];
    const activeChat = recentChats.find(c => c.id === chatId);
    if (activeChat) {
      const member = activeChat.members.find(m => String(m.id) === String(peerId));
      if (member) return member.fullName;
    }
    return `Studio Peer: ${peerId.substring(0, 4)}...`;
  }, [chatId, queryClient]);

  useEffect(() => {
    let isMounted = true;
    socket.current = connectSocket();

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream.current = stream;
        
        // Trigger a re-render so LocalVideo gets the stream
        setConnectionStatus("ready");

        // Join call room and notify others
        socket.current.emit("call:join", { chatId: callDataRef.current.chatId });
      } catch (err) {
        toast.error("Could not access camera/mic.");
      }
    };

    startMedia();

    socket.current.on("call:user-joined", async ({ userId }) => {
      if (String(userId) === String(callDataRef.current.currentUserId)) return;
      
      if (peerConnections.current.size >= 5) {
        toast.error("Room is full (Max 6 participants).");
        return;
      }

      // Existing peers initiate offer to the newcomer
      const pc = createPeerConnection(userId, localStream.current);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.current.emit("webrtc-offer", {
          targetUserId: userId,
          offer,
          chatId: callDataRef.current.chatId,
        });
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    });

    socket.current.on("webrtc-offer", async (data) => {
      const fromUserId = data.fromUserId;
      let pc = peerConnections.current.get(fromUserId);
      
      if (!pc && peerConnections.current.size >= 5) {
        toast.error("Room is full (Max 6 participants).");
        return;
      }
      
      if (!pc) {
        pc = createPeerConnection(fromUserId, localStream.current);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.current.emit("webrtc-answer", {
          targetUserId: fromUserId,
          answer,
          chatId: callDataRef.current.chatId,
        });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    });

    socket.current.on("webrtc-answer", async (data) => {
      const pc = peerConnections.current.get(data.fromUserId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (err) {
          console.error("Error handling answer:", err);
        }
      }
    });

    socket.current.on("call:response", (data) => {
      if (data.accepted === false) {
        toast.error(`${targetName || "Recipient"} declined the call.`);
      }
    });

    socket.current.on("webrtc-ice-candidate", async (data) => {
      const pc = peerConnections.current.get(data.fromUserId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    });

    return () => {
      isMounted = false;
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      
      // Relying on backend disconnected reaper for dead connections instead of React unmounts

      socket.current?.off("call:user-joined");
      socket.current?.off("webrtc-offer");
      socket.current?.off("webrtc-answer");
      socket.current?.off("webrtc-ice-candidate");

      // Aggressive track stop for all streams to avoid zombie browser banners
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((track) => track.stop());
        displayStreamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStartRecording = async () => {
    toast("Please select 'This Tab' and check 'Share Tab Audio' in the prompt.", {
      icon: "🎬",
      duration: 5000,
    });

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
        preferCurrentTab: true,
        surfaceSwitching: "exclude"
      });
      displayStreamRef.current = displayStream;

      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();

      if (displayStream.getAudioTracks().length > 0) {
        audioCtx.createMediaStreamSource(displayStream).connect(dest);
      }

      const localMicTrack = localStream.current?.getAudioTracks()[0];
      if (localMicTrack) {
        const micStream = new MediaStream([localMicTrack]);
        audioCtx.createMediaStreamSource(micStream).connect(dest);
      }

      const compositeStream = new MediaStream([
        displayStream.getVideoTracks()[0],
        dest.stream.getAudioTracks()[0]
      ]);
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

      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state !== "inactive") {
          handleStopRecording();
        }
      };

      recordingStartTimeRef.current = new Date();
      mediaRecorderRef.current.start(1000);
    } catch (err) {
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

    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach(track => track.stop());
      displayStreamRef.current = null;
    }

    setTimeout(async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const TWO_GB = 2 * 1024 * 1024 * 1024;

      if (blob.size < TWO_GB) {
        try {
          const date = recordingStartTimeRef.current || new Date();
          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
          const prettyName = `[${targetName || "Session"}]_${formattedDate}.webm`;

          const file = new File([blob], prettyName, { type: "video/webm" });
          const { fileUrl, originalName } = await import("../lib/api").then(m => m.uploadFileDirectly(file));

          // E2EE Encryption for the notification message
          const aesKey = await getSessionKey(chatId);
          const notificationText = "🎬 Collaboration session recorded.";
          const encryptedContent = aesKey ? await encryptMessage(aesKey, notificationText) : null;

          const messagePayload = {
            chatId,
            content: encryptedContent,
            text: notificationText, // Fallback/Optimistic
            fileUrl,
            originalName: originalName,
            fileType: "video/webm"
          };

          socket.current.emit("send_message", messagePayload);

        } catch (err) {
          console.error("Recording upload failed:", err);
        }
      } else {
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
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        setIsScreensharing(true);

        screenTrack.onended = () => {
          stopScreenshare();
        };
      } else {
        stopScreenshare();
      }
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        toast.error("Screenshare error.");
      }
    }
  };

  const stopScreenshare = () => {
    try {
      if (localStream.current) {
        const cameraTrack = localStream.current.getVideoTracks()[0];
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
        });
      }

      setIsScreensharing(false);

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
    } catch (err) {
    }
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => (track.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach((track) => (track.enabled = isVideoOff));
      setIsVideoOff(!isVideoOff);
    }
  };

  const requestFullscreen = React.useCallback((element) => {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }, []);

  const streamArray = Array.from(remoteStreams.entries());
  
  const getGridLayout = (count) => {
    if (count === 1) return "grid-cols-1 max-w-2xl mx-auto w-full";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count === 3) return "grid-cols-1 md:grid-cols-3"; // 3 in a row
    if (count === 4) return "grid-cols-1 md:grid-cols-2"; // 2x2 grid
    if (count >= 5) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2";
  };

  const participantCount = 1 + remoteStreams.size;

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

      {/* Videos Layout Grid */}
      <div className={`flex-1 min-h-0 w-full max-w-7xl mx-auto grid ${getGridLayout(participantCount)} gap-4 relative auto-rows-fr p-2 md:p-4`}>
        
        {/* Local Video */}
        <LocalVideo 
          stream={isScreensharing ? screenStreamRef.current : localStream.current} 
          isScreensharing={isScreensharing} 
        />

        {/* Remote Videos */}
        {streamArray.map(([userId, stream]) => (
          <RemoteVideo 
            key={userId}
            stream={stream}
            userId={userId}
            fitMode={fitModes[userId]}
            resolveName={resolvePeerName}
            toggleFitMode={toggleFitMode}
          />
        ))}

        {connectionStatus === "initializing" && streamArray.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm rounded-2xl">
            <span className="loading loading-infinity loading-lg text-primary scale-150 mb-4" />
            <p className="font-mono text-sm text-white/50 animate-pulse tracking-widest uppercase">Initializing Canvas...</p>
          </div>
        )}
      </div>

      {/* Constraints Dashboard / Controls */}
      <div className="mt-8 flex justify-center items-center gap-4 flex-wrap md:gap-6">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button
          onClick={toggleVideo}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
          title="Toggle Video"
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>

        <button
          onClick={toggleScreenshare}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isScreensharing ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
          title={isScreensharing ? "Stop Screenshare" : "Share Screen"}
        >
          <CloudUpload size={24} />
        </button>

        <div className="hidden md:block w-[1px] h-10 bg-white/10 mx-2" />

        {isRecording ? (
          <button
            onClick={handleStopRecording}
            className="h-12 md:h-14 px-6 md:px-8 rounded-full bg-red-500 text-white font-black uppercase tracking-widest text-xs animate-pulse shadow-xl shadow-red-500/40 hover:scale-105 active:scale-95 transition-all"
          >
            Stop REC
          </button>
        ) : (
          <button
            onClick={handleStartRecording}
            className="h-12 md:h-14 px-6 md:px-8 rounded-full bg-white/10 text-white font-black uppercase tracking-widest text-xs border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            Record Session
          </button>
        )}

        <button
          onClick={onEndCall}
          className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95 transition-all"
        >
          < PhoneOff size={28} />
        </button>
      </div>

      <div className="hidden md:flex absolute bottom-6 right-8 items-center gap-3 opacity-30 select-none">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase tracking-widest">Mesh Network</span>
          <span className="text-[8px] font-mono">Active Peers: {streamArray.length}</span>
        </div>
        <div className="w-8 h-8 rounded-lg border border-white flex items-center justify-center">
          <ShieldAlert size={14} />
        </div>
      </div>
    </div>
  );
};

export default VideoCallOverlay;
