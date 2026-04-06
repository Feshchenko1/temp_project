import React, { useState, useEffect, useRef, useCallback } from "react";
import { Video, Mic, MicOff, VideoOff, PhoneOff, Download, CloudUpload, Maximize } from "lucide-react";
import { connectSocket } from "../lib/socketClient";
import toast from "react-hot-toast";

const VideoCallOverlay = ({ chatId, currentUserId, targetUserId, isInitiator, onEndCall, onAddMessage }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreensharing, setIsScreensharing] = useState(false);

  // MediaRecorder states
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSize, setRecordedSize] = useState(0);

  const socket = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStreamRef = useRef(null);
  const isNegotiating = useRef(false);

  // BUG 2 FIX: Use useCallback and ensure media initialization is awaitable
  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setTimeout(async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const TWO_GB = 2 * 1024 * 1024 * 1024;

      if (blob.size < TWO_GB) {
        try {
          const file = new File([blob], `Session_${Date.now()}.webm`, { type: "video/webm" });
          const { fileUrl, originalName } = await import("../lib/api").then(m => m.uploadFileDirectly(file));

          const messagePayload = {
            chatId,
            text: "🎬 Collaboration session recorded.",
            fileUrl,
            fileName: originalName
          };

          socket.current.emit("send_message", messagePayload);

          if (onAddMessage) {
            onAddMessage({
              id: Date.now(),
              sender: currentUserId,
              ...messagePayload
            });
          }
        } catch (err) {
          console.error("Auto-upload failed. Fallback to local.", err);
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
  }, [chatId, currentUserId, onAddMessage]);

  const setupMediaRecorder = useCallback((stream) => {
    const options = { mimeType: "video/webm; codecs=vp9" };
    try {
      mediaRecorderRef.current = new MediaRecorder(stream, options);
    } catch {
      mediaRecorderRef.current = new MediaRecorder(stream);
    }

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
        const currentSize = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
        setRecordedSize(currentSize);

        const TWO_GB = 2 * 1024 * 1024 * 1024;
        if (currentSize > TWO_GB) {
          console.warn("Edge Constraint Hit: 2GB buffer exceeded. Forcing local download fallback.");
          handleStopRecording(); 
        }
      }
    };
  }, [handleStopRecording]);

  const startMedia = useCallback(async () => {
    if (localStream.current) return localStream.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStream.current = stream;
      
      // Strict layout enforcement: ensure local stream is pinned to local ref
      syncVideoStreams();

      setupMediaRecorder(stream);
      
      if (peerConnection.current && stream) {
        stream.getTracks().forEach((track) => {
          const senders = peerConnection.current.getSenders();
          if (!senders.some(s => s.track === track)) {
            peerConnection.current.addTrack(track, stream);
          }
        });
      }
      return stream;
    } catch (err) {
      toast.error("Could not access camera/mic.");
      console.error("Failed to access media devices", err);
      return null;
    }
  }, [setupMediaRecorder]);

  /**
   * ATOMIC STREAM SYNC
   * Centralized method to ensure local and remote streams are assigned 
   * ONLY to their correct containers.
   */
  const syncVideoStreams = useCallback(() => {
    // 1. Sync Local Video (Regular or Screen Share)
    const currentLocalStream = isScreensharing ? screenStreamRef.current : localStream.current;
    if (localVideoRef.current && currentLocalStream) {
      if (localVideoRef.current.srcObject !== currentLocalStream) {
        console.log("Syncing Local Video Stream...");
        localVideoRef.current.srcObject = currentLocalStream;
      }
    }

    // 2. Sync Remote Video
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        console.log("Syncing Remote Video Stream...");
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    }
  }, [isScreensharing]);

  // Perpetually ensure streams are pinned correctly (robust against race conditions)
  useEffect(() => {
    syncVideoStreams();
    const interval = setInterval(syncVideoStreams, 2000); // Check every 2s as a fallback
    return () => clearInterval(interval);
  }, [syncVideoStreams]);

  useEffect(() => {
    socket.current = connectSocket();

    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    peerConnection.current = new RTCPeerConnection(configuration);

    // BUG 3: isNegotiating guard to prevent SDP collisions
    peerConnection.current.onnegotiationneeded = async () => {
      try {
        if (isNegotiating.current || peerConnection.current.signalingState !== "stable") return;
        isNegotiating.current = true;
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.current.emit("webrtc-offer", {
          targetUserId,
          offer: peerConnection.current.localDescription,
          chatId
        });
      } catch (err) {
        console.error("Negotiation error:", err);
      }
    };

    peerConnection.current.onsignalingstatechange = () => {
      if (peerConnection.current && peerConnection.current.signalingState === "stable") {
        isNegotiating.current = false;
      }
    };

    peerConnection.current.ontrack = (event) => {
      console.log("New Track Received from Peer");
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        syncVideoStreams();
      }
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("webrtc-ice-candidate", {
          targetUserId,
          candidate: event.candidate,
          chatId
        });
      }
    };

    // Signaling Listeners
    socket.current.on("webrtc-offer", async (data) => {
      if (data.fromUserId !== targetUserId) return;
      try {
        // BUG 2 Fix: Await local media before processing offer to fix asymmetric "ghosting"
        await startMedia();

        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.current.emit("webrtc-answer", {
          targetUserId: data.fromUserId,
          answer: peerConnection.current.localDescription,
          chatId
        });
      } catch (err) {
        console.error("Error handling WebRTC offer", err);
      }
    });

    socket.current.on("webrtc-answer", async (data) => {
      if (data.fromUserId !== targetUserId) return;
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (err) {
        console.error("Error handling WebRTC answer", err);
      }
    });

    socket.current.on("webrtc-ice-candidate", async (data) => {
      if (data.fromUserId !== targetUserId) return;
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    });

    // Start local media automatically
    startMedia();

    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      socket.current?.off("webrtc-offer");
      socket.current?.off("webrtc-answer");
      socket.current?.off("webrtc-ice-candidate");
    };
  }, [isInitiator, chatId, targetUserId, startMedia]);

  const handleStartRecording = useCallback(() => {
    chunksRef.current = [];
    setRecordedSize(0);
    setIsRecording(true);

    const remoteStream = remoteVideoRef.current?.srcObject;
    const localStreamObj = localStream.current;

    const recordTracks = [
      ...(remoteStream?.getVideoTracks() || []),
      ...(remoteStream?.getAudioTracks() || []),
      ...(localStreamObj?.getAudioTracks() || [])
    ];

    const mixedStream = new MediaStream(recordTracks);

    const options = { mimeType: "video/webm; codecs=vp9" };
    try {
      mediaRecorderRef.current = new MediaRecorder(mixedStream, options);
    } catch {
      mediaRecorderRef.current = new MediaRecorder(mixedStream);
    }

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
        const currentSize = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
        setRecordedSize(currentSize);
      }
    };

    mediaRecorderRef.current.start(1000);
  }, []);

  const toggleScreenshare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
        const sender = peerConnection.current.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
        syncVideoStreams();
      }

      setIsScreensharing(true);

      screenTrack.onended = () => {
        setIsScreensharing(false);
        screenStreamRef.current = null;
        navigator.mediaDevices.getUserMedia({ video: true }).then(camStream => {
          const camTrack = camStream.getVideoTracks()[0];
          if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
            const sender = peerConnection.current.getSenders().find(s => s.track?.kind === "video");
            if (sender) sender.replaceTrack(camTrack);
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = camStream;
            syncVideoStreams();
          }
        });
      };
    } catch (err) {
      if (err.name === "NotAllowedError") {
        console.log("Screenshare denied by user (silent handle)");
      } else {
        toast.error("Screenshare error.");
        console.error("Screenshare error:", err);
      }
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
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        <div className="bg-base-300 rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl group">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted={true}
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
          <video ref={remoteVideoRef} autoPlay playsInline muted={false} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50 -z-10">
            <span className="loading loading-ring loading-lg text-primary"></span>
            <p className="mt-4 font-mono text-sm">Awaiting Peer Connection...</p>
          </div>
          <button
            onClick={() => requestFullscreen(remoteVideoRef.current)}
            className="absolute top-4 right-4 bg-black/40 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>

      {/* Constraints Dashboard / Controls */}
      <div className="mt-6 flex justify-center items-center gap-4">
        <button onClick={toggleMute} className={`btn btn-circle ${isMuted ? 'btn-error' : 'btn-neutral'}`}>
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button onClick={toggleVideo} className={`btn btn-circle ${isVideoOff ? 'btn-error' : 'btn-neutral'}`} title="Toggle Video">
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <button onClick={toggleScreenshare} className="btn btn-circle btn-neutral" title="Share Screen">
          <CloudUpload size={20} />
        </button>

        {isRecording ? (
          <button onClick={handleStopRecording} className="btn btn-error shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            Stop Recording
          </button>
        ) : (
          <button onClick={handleStartRecording} className="btn border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2" /> Record Collaboration
          </button>
        )}

        <button onClick={onEndCall} className="btn btn-error btn-circle mx-4 hover:-translate-y-1 transition-transform">
          <PhoneOff size={20} />
        </button>
      </div>

      <div className="absolute bottom-4 right-4 text-xs opacity-40 font-mono">
        WebRTC P2P | Edge Optimized | &lt;2GB S3 Policy Enabled
      </div>
    </div>
  );
};

export default VideoCallOverlay;
