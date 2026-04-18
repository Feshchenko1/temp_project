import React, { useState, useEffect, useRef } from "react";
import { Lock, Send, ShieldAlert, Video, Paperclip, LoaderIcon, Smile, Reply, Pin, Copy, ArrowRight, Pencil, Trash2, PinOff, XCircle } from "lucide-react";
import { useLayoutStore } from "../store/useLayoutStore";
import { connectSocket } from "../lib/socketClient";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

import MessageAttachment from "./MessageAttachment";
import MessageBubble from "./MessageBubble";
import VideoCallOverlay from "./VideoCallOverlay";
import ForwardModal from "./ForwardModal";
import { useCallStore } from '../store/useCallStore';

import {
  encryptMessage,
  decryptMessage,
  getPrivateKey,
  savePrivateKey,
  getSessionKey,
  saveSessionKey,
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  generateSymmetricKey,
  encryptSymmetricKey,
  decryptSymmetricKey,
  purgeChatCryptoData,
  rotateSessionKey
} from "../lib/crypto";

import {
  uploadFileDirectly,
  getChatMessages,
  getChatDetails,
  getRecentChats,
  deleteMessage as deleteMessageApi,
  updateMessage as updateMessageApi,
  togglePinMessage as togglePinMessageApi,
  endChatSession,
  getGroupKeys,
  storeGroupKeys,
  updatePublicKey,
  getUserById
} from "../lib/api";

const SecureChat = ({ chatId, currentUserId, targetUserId, targetUserName }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);


  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState(null);
  const pinnedMessages = messages.filter(m => m.isPinned);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);


  const [aesKey, setAesKey] = useState(null);
  const [isKeyInitializing, setIsKeyInitializing] = useState(true);
  const [cryptoError, setCryptoError] = useState(null);
  const [isAutoSecuring, setIsAutoSecuring] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { onlineUserIds } = useLayoutStore();
  const isPeerOnline = onlineUserIds.includes(targetUserId);


  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const contextMenuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socket = useRef(null);
  const isRegeneratingRef = useRef(false);
  const hasAttemptedAutoRecovery = useRef(false);
  const currentChatIdRef = useRef(chatId);
  const rotationAttemptsRef = useRef(0);
  const isOrchestratingRef = useRef(false);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    currentChatIdRef.current = chatId;
    rotationAttemptsRef.current = 0;
    const processId = chatId;

    setAesKey(null);
    setIsKeyInitializing(true);
    setMessages([]);
    setCryptoError(null);
    setIsAutoSecuring(false);

    const orchestrateChatInit = async () => {
      if (isOrchestratingRef.current) return;
      isOrchestratingRef.current = true;

      setIsLoading(true);
      hasAttemptedAutoRecovery.current = false;

      try {

        const [history, info] = await Promise.all([
          getChatMessages(processId),
          getChatDetails(processId)
        ]);

        if (currentChatIdRef.current !== processId) return;

        setMessages(history);
        setChatInfo(info);
        setIsLoading(false);

        if (isRegeneratingRef.current) return;

        let privKey = await getPrivateKey(currentUserId);
        if (currentChatIdRef.current !== processId) return;

        const me = info.members.find(m => m.id === currentUserId);
        const hasServerPubKey = !!me?.publicKey;

        if (!privKey) {
          if (hasServerPubKey) {
            if (hasAttemptedAutoRecovery.current) {
              setCryptoError("LOCKOUT");
              setIsKeyInitializing(false);
              return;
            }
            hasAttemptedAutoRecovery.current = true;
            await handleRegenerateRSAIdentity(true);
          } else {
            const pair = await generateKeyPair();
            const pubBase64 = await exportPublicKey(pair.publicKey);
            await savePrivateKey(currentUserId, pair.privateKey);
            await updatePublicKey(pubBase64);
            if (currentChatIdRef.current !== processId) return;
            await handleRotateAESOnly(true);
          }
        } else {

          const localKey = await getSessionKey(processId);
          if (currentChatIdRef.current !== processId) return;

          if (localKey) {
            setAesKey(localKey);
          } else {

            const serverKeys = await getGroupKeys(processId);
            if (currentChatIdRef.current !== processId) return;
            const myKeyEntry = serverKeys.find(k => k.recipientId === currentUserId);

            if (myKeyEntry) {
              try {
                const decKey = await decryptSymmetricKey(privKey, myKeyEntry.encryptedAesKey);
                if (currentChatIdRef.current !== processId) return;

                await saveSessionKey(processId, decKey);

                setAesKey(decKey);
              } catch (decryptErr) {
                if (decryptErr.name === 'OperationError') {
                  setCryptoError("SYNC_FAIL");
                } else {
                  throw decryptErr;
                }
              }
            } else {
              await handleRotateAESOnly(true);
            }
          }
        }
      } catch (err) {
        if (currentChatIdRef.current !== processId) return;
        setCryptoError("Security subsystem error.");
        toast.error("Security sync failed.");
      } finally {
        if (currentChatIdRef.current === processId) {
          setIsKeyInitializing(false);
          setIsLoading(false);
          isOrchestratingRef.current = false;
        }
      }
    };

    const syncLatestSessionKey = async () => {
      if (currentChatIdRef.current !== processId) return;

      try {

        const localKey = await getSessionKey(processId);
        if (currentChatIdRef.current !== processId) return;
        if (localKey) {
          setAesKey(localKey);
          return;
        }

        const privKey = await getPrivateKey(currentUserId);
        if (currentChatIdRef.current !== processId) return;

        const serverKeys = await getGroupKeys(processId);
        if (currentChatIdRef.current !== processId) return;

        const myKeyEntry = serverKeys.find(k => k.recipientId === currentUserId);
        if (myKeyEntry) {
          const decKey = await decryptSymmetricKey(privKey, myKeyEntry.encryptedAesKey);
          if (currentChatIdRef.current !== processId) return;

          await saveSessionKey(processId, decKey);
          setAesKey(decKey);
          setIsAutoSecuring(false);
        }
      } catch (err) {
      }
    };

    orchestrateChatInit();

    socket.current = connectSocket();

    const joinRoom = () => {
      if (currentChatIdRef.current === processId) {
        socket.current.emit("join-chat", processId);
      }
    };

    joinRoom();
    socket.current.on("connect", joinRoom);

    socket.current.on("receive_message", (data) => {
      if (data.chatId !== processId) return;
      setMessages((prev) => {
        if (data.clientSideId) {
          const index = prev.findIndex(m => m.clientSideId === data.clientSideId || m.id === data.id);
          if (index !== -1) {
            const newMessages = [...prev];
            newMessages[index] = data;
            return newMessages;
          }
        }
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    socket.current.on("messages_read", ({ chatId: readChatId, messageIds }) => {
      if (readChatId === processId) {
        setMessages(prev => prev.map(m =>
          messageIds.includes(m.id) ? { ...m, status: "READ" } : m
        ));
      }
    });

    socket.current.on("message_deleted", (msgId) => {
      setMessages((prev) => prev.filter(m => m.id !== msgId));
    });

    socket.current.on("message_updated", (updatedMsg) => {
      setMessages((prev) => prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg)));
    });

    socket.current.on("message_pinned", ({ msgId, isPinned }) => {
      setMessages((prev) => prev.map((msg) => (msg.id === msgId ? { ...msg, isPinned } : msg)));
    });

    socket.current.on("user_key_updated", ({ userId, publicKey }) => {
      if (userId === targetUserId && currentChatIdRef.current === processId) {
        syncLatestSessionKey();
      }
    });

    socket.current.on("keys_regenerated_update", (payload) => {
      const { chatId: updatedChatId, senderId } = payload || {};
      if (isRegeneratingRef.current || senderId === currentUserId || updatedChatId !== processId) return;

      setIsAutoSecuring(true);
      syncLatestSessionKey();
    });

    return () => {
      socket.current.emit("leave-chat", processId);
      socket.current.off("connect", joinRoom);
      socket.current.off("receive_message");
      socket.current.off("messages_read");
      socket.current.off("message_deleted");
      socket.current.off("message_updated");
      socket.current.off("message_pinned");
      socket.current.off("user_key_updated");
      socket.current.off("keys_regenerated_update");
      isOrchestratingRef.current = false;
    };
  }, [chatId, currentUserId]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showEmojiPicker]);

  const handleRotateAESOnly = async (isAuto = false) => {
    if (rotationAttemptsRef.current >= 2) {
      setCryptoError("Security Handshake Failed. Please click 'Re-secure session'.");
      setIsKeyInitializing(false);
      setIsAutoSecuring(false);
      return;
    }

    isRegeneratingRef.current = true;
    if (isAuto) {
      setIsAutoSecuring(true);
      rotationAttemptsRef.current += 1;
    } else {
      setIsKeyInitializing(true);
      rotationAttemptsRef.current = 0;
    }

    setCryptoError(null);
    try {

      const chatDetails = await getChatDetails(chatId);
      const otherMember = chatDetails.members.find(m => m.id !== currentUserId);

      if (!otherMember) {
        throw new Error("Recipient not found in chat.");
      }

      const freshPeerRaw = await getUserById(otherMember.id);
      const freshSelfRaw = await getUserById(currentUserId);


      const peerPubKey = freshPeerRaw?.publicKey || freshPeerRaw?.user?.publicKey;
      const selfPubKey = freshSelfRaw?.publicKey || freshSelfRaw?.user?.publicKey;

      if (!peerPubKey) throw new Error("Peer public key missing. Security initialization required.");
      if (!selfPubKey) throw new Error("Local public key missing. Security initialization required.");

      const updatedMembers = chatDetails.members.map(m => {
        if (m.id === otherMember.id) return { ...m, publicKey: peerPubKey };
        if (m.id === currentUserId) return { ...m, publicKey: selfPubKey };
        return m;
      });


      const { newAesKey, encryptedKeys } = await rotateSessionKey(updatedMembers);
      await storeGroupKeys(chatId, encryptedKeys);

      setAesKey(newAesKey);
      socket.current.emit("keys_regenerated", { chatId, senderId: currentUserId });

      if (!isAuto) toast.success("Secure session rotated successfully");
    } catch (err) {
      if (isAuto) {
        setCryptoError("Session sync failed. Re-sync required.");
      } else {
        toast.error(err.message || "Failed to rotate security session.");
      }
    } finally {
      isRegeneratingRef.current = false;
      setIsKeyInitializing(false);
      setIsAutoSecuring(false);
    }
  };

  const handleRegenerateRSAIdentity = async (isAuto = false) => {
    if (!isAuto) {
      const confirmMessage = "Warning: Generating a new Cryptographic Identity (RSA) will permanently lock your access to ALL current messages in this chat and potentially others. Only proceed if your device was compromised or you lost your previous identity. Proceed?";
      if (!window.confirm(confirmMessage)) return;
    }

    isRegeneratingRef.current = true;
    if (isAuto) setIsAutoSecuring(true);
    else setIsKeyInitializing(true);

    setCryptoError(null);
    try {

      const pair = await generateKeyPair();

      await savePrivateKey(currentUserId, pair.privateKey);

      const pubBase64 = await exportPublicKey(pair.publicKey);

      await updatePublicKey(pubBase64);
      socket.current.emit("user_key_updated", { userId: currentUserId, publicKey: pubBase64 });
      const chatDetails = await getChatDetails(chatId);
      const otherMember = chatDetails.members.find(m => m.id !== currentUserId);

      let membersToEncryptFor = chatDetails.members.map(m =>
        m.id === currentUserId ? { ...m, publicKey: pubBase64 } : m
      );
      if (otherMember) {
        const freshPeer = await getUserById(otherMember.id);
        if (freshPeer?.publicKey) {
          membersToEncryptFor = membersToEncryptFor.map(m =>
            m.id === otherMember.id ? { ...m, publicKey: freshPeer.publicKey } : m
          );
        }
      }

      const { newAesKey, encryptedKeys } = await rotateSessionKey(membersToEncryptFor);
      await storeGroupKeys(chatId, encryptedKeys);

      setAesKey(newAesKey);
      socket.current.emit("keys_regenerated", { chatId, senderId: currentUserId });

      if (!isAuto) toast.success("Identity and session regenerated successfully");
    } catch (err) {
      if (!isAuto) toast.error(err.message || "Failed to regenerate security identity.");
      setCryptoError("Critical security failure: Identity lost.");
    } finally {
      isRegeneratingRef.current = false;
      setIsKeyInitializing(false);
      setIsAutoSecuring(false);
    }
  };





  const handleEditStart = async (message) => {
    setEditingMessage(message);
    setReplyTo(null);
    try {
      const decrypted = await decryptMessage(aesKey, message.content);
      setInputText(decrypted || "");
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err) {
      setInputText("");
      toast.error("Decryption failed for editing.");
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handleForward = (m) => {
    setMessageToForward(m);
    setIsForwardModalOpen(true);
  };

  const handleForwardConfirm = async (targetChatId) => {
    if (!messageToForward || !aesKey) return;

    try {
      const decrypted = await decryptMessage(aesKey, messageToForward.content);

      const targetKeys = await getGroupKeys(targetChatId);
      const myKeyObj = targetKeys.find(k => k.recipientId === currentUserId);

      if (!myKeyObj) {
        toast.error("Target chat security not established.");
        return;
      }

      const privKey = await getPrivateKey(currentUserId);
      const targetAesKey = await decryptSymmetricKey(privKey, myKeyObj.encryptedAesKey);

      const reEncrypted = await encryptMessage(targetAesKey, decrypted);

      socket.current.emit("send_message", {
        chatId: targetChatId,
        content: reEncrypted,
        fileUrl: messageToForward.fileUrl,
        fileType: messageToForward.fileType,
        originalName: messageToForward.originalName
      });

      toast.success("Message forwarded");
      setIsForwardModalOpen(false);
      toast.success("Message forwarded securely");
    } catch (err) {
      toast.error("Failed to forward securely.");
    }
  };


  const handleDelete = async (msgId) => {
    try {
      await deleteMessageApi(msgId);
      socket.current.emit("delete_message", { chatId, msgId });
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast.success("Message deleted permanently");
    } catch (err) {
      toast.error("Deletion failed");
    }
  };

  const handleTogglePin = async (msgId) => {
    try {
      const res = await togglePinMessageApi(msgId);
      socket.current.emit("pin_message", { chatId, msgId, isPinned: res.isPinned });
      toast.success(res.isPinned ? "Message pinned" : "Message unpinned");
    } catch (err) {
      toast.error("Pinning failed");
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm("End this ephemeral session? All messages and keys will be destroyed on ALL devices and this device.")) return;
    try {
      await endChatSession(chatId);
      await purgeChatCryptoData(chatId);
      toast.success("Session and device keys destroyed.");
      window.location.reload();
    } catch (err) {
      toast.error("Failed to destroy session");
    }
  };



  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingFile) return;
    if (!aesKey) {
      toast.error("Security channel not ready.");
      return;
    }

    if (editingMessage) {
      try {
        const encryptedContent = await encryptMessage(aesKey, inputText.trim());
        await updateMessageApi(editingMessage.id, encryptedContent);
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: encryptedContent, isEdited: true } : m));
        setEditingMessage(null);
        setInputText("");
        toast.success("Message updated");
      } catch (err) {
        toast.error("Edit failed");
      }
      return;
    }

    let attachmentUrl = "";
    let originalName = "";
    if (pendingFile) {
      setIsUploading(true);
      try {
        const result = await uploadFileDirectly(pendingFile);
        attachmentUrl = result.fileUrl;
        originalName = result.originalName;
      } catch {
        toast.error("Upload failed");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
      setPendingFile(null);
    }

    const clientSideId = "temp-" + Date.now();
    const messagePayload = {
      chatId,
      content: await encryptMessage(aesKey, inputText.trim()),
      fileUrl: attachmentUrl,
      fileType: pendingFile?.type || "TEXT",
      originalName: originalName,
      replyToId: replyTo?.id || null,
      clientSideId
    };

    const optimisticMsg = {
      id: clientSideId,
      clientSideId,
      senderId: currentUserId,
      content: messagePayload.content,
      text: inputText.trim(),
      fileUrl: messagePayload.fileUrl,
      originalName: messagePayload.originalName,
      replyTo: replyTo,
      createdAt: new Date().toISOString(),
      status: "SENDING"
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    socket.current.emit("send_message", messagePayload);


    setInputText("");
    setReplyTo(null);
  };


  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const TWO_GB = 2 * 1024 * 1024 * 1024;
    if (file.size > TWO_GB) {
      toast.error("Hardware limit reach (2GB). Use local recording.");
      return;
    }

    setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onEmojiClick = (emojiData) => {
    setInputText((prev) => prev + emojiData.emoji);
  };

  const [pendingFile, setPendingFile] = useState(null);
  const { initiateCall } = useCallStore();

  const handleStartCall = () => {
    initiateCall({
      targetUserId,
      targetName: targetUserName,
      chatId,
      callType: "video"
    });

    socket.current.emit("call:initiate", {
      targetUserId,
      chatId,
      callerName: "Studio Peer"
    });
  };

  useEffect(() => {
    if (!socket.current || !messages.length) return;

    const unreadMessages = messages.filter(
      m => m.senderId !== currentUserId && m.status !== "READ" && !String(m.id).startsWith("temp-")
    );

    if (unreadMessages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleIds = entries
          .filter(entry => entry.isIntersecting)
          .map(entry => entry.target.dataset.id);

        if (visibleIds.length > 0) {
          socket.current.emit("mark_as_read", {
            chatId,
            messageIds: visibleIds
          });
        }
      },
      { threshold: 0.1 }
    );

    unreadMessages.forEach(m => {
      const el = document.getElementById(`msg-${m.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [messages, chatId, currentUserId]);
  return (
    <div className="flex flex-col h-full bg-base-300 rounded-xl overflow-hidden shadow-2xl border border-white/5">
      {/* Global Call UI handling moved to App.jsx */}

      {/* Header */}
      <div className="bg-base-100 p-4 border-b border-white/10 flex justify-between items-center bg-opacity-80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success/20 text-success rounded-lg">
            <Lock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{targetUserName || "Secure Channel"}</h3>
              <div className={`size-2.5 rounded-full ${isPeerOnline ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-base-content/20"}`} />
            </div>
            <p className="text-xs opacity-60 flex items-center gap-1">
              {isPeerOnline ? "Live Session" : "End-to-End Encrypted"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chatInfo?.isEphemeral && (
            <button
              onClick={handleEndSession}
              className="btn btn-sm bg-error/10 text-error border-error/20 hover:bg-error hover:text-white rounded-full gap-2 mr-2 px-4 transition-all duration-300 group"
              title="End Secure Session & Destroy All Data"
            >
              <Trash2 size={14} className="group-hover:animate-pulse" />
              <span className="hidden sm:inline">Zero-Trace Exit</span>
            </button>
          )}
          <button
            onClick={handleStartCall}
            className="btn btn-circle btn-ghost text-primary hover:bg-primary/10"
            title="Start Collaboration Call"
          >
            <Video size={20} />
          </button>
          <button
            onClick={() => handleRotateAESOnly(false)}
            className={`btn btn-circle btn-ghost ${cryptoError ? 'text-error animate-pulse' : 'text-primary'} hover:bg-primary/10`}
            title="Rotate Session Key"
            disabled={isKeyInitializing}
          >
            {isKeyInitializing ? <LoaderIcon className="animate-spin" size={20} /> : <ShieldAlert size={20} />}
          </button>
        </div>
      </div>

      {/* PINNED MESSAGES HEADER */}
      {pinnedMessages.length > 0 && (
        <div className="bg-primary/5 px-4 py-2 border-b border-primary/10 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Pin size={12} />
            <span>{pinnedMessages.length} Pinned {pinnedMessages.length === 1 ? 'Message' : 'Messages'}</span>
          </div>
          <button
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className="btn btn-ghost btn-xs text-primary hover:bg-primary/10"
          >
            {showPinnedOnly ? "Show All" : "View Pins"}
          </button>
        </div>
      )}


      {/* Global Call UI Overlay handling moved to App.jsx */}

      {/* AUTO-SECURING OVERLAY */}
      {isAutoSecuring && (
        <div className="absolute inset-0 z-50 bg-base-300/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center">
            <LoaderIcon className="animate-spin text-primary mb-4" size={40} />
            <h2 className="text-xl font-bold text-base-content mb-1">Securing connection...</h2>
            <p className="text-sm text-base-content/60">Establishing high-fidelity encryption</p>
          </div>
        </div>
      )}

      {/* SECURITY LOCKOUT OVERLAY */}
      {cryptoError && (
        <div className="absolute inset-0 z-40 bg-base-300/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="size-20 bg-error/20 text-error rounded-full flex items-center justify-center mb-6 border border-error/30">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-2xl font-bold text-base-content mb-2">Security Handshake Failed</h2>
          <p className="max-w-xs text-base-content/60 mb-8">
            Your encryption keys are out of sync with your peer. This usually happens after a logout or device switch.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => handleRotateAESOnly(false)}
              className="btn btn-primary w-full shadow-lg shadow-primary/20 rounded-2xl"
              disabled={isKeyInitializing}
            >
              {isKeyInitializing ? "Syncing..." : "Re-secure Session"}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-ghost w-full"
            >
              Refresh App
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {cryptoError && (
          <div className="absolute inset-x-0 top-1/4 z-10 px-8 animate-in fade-in zoom-in duration-300">
            <div className="card bg-base-300/90 backdrop-blur-md border border-warning/20 shadow-2xl p-6 text-center">
              <ShieldAlert className="mx-auto text-warning mb-4" size={48} />
              <h4 className="font-bold text-lg mb-2">
                {cryptoError === "LOCKOUT" ? "Security Mismatch" : "Secure Sync Required"}
              </h4>
              <p className="text-sm opacity-70 mb-4">
                {cryptoError === "LOCKOUT"
                  ? "Your security keys have changed. To read past messages and send new ones, you must regenerate the session key for this chat."
                  : cryptoError}
              </p>
              <div className="flex flex-col gap-2">
                {cryptoError === "LOCKOUT" ? (
                  <button
                    onClick={() => handleRegenerateRSAIdentity(false)}
                    className="btn btn-warning rounded-2xl gap-2 shadow-lg hover:scale-105 transition-transform"
                  >
                    <Lock size={18} /> Regenerate Session Key
                  </button>
                ) : (
                  <div className="badge badge-outline badge-warning mx-auto py-3">
                    Waiting for Peer Initialization
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <LoaderIcon className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          (showPinnedOnly ? pinnedMessages : messages).map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              aesKey={aesKey}
              currentUserId={currentUserId}
              highlightedMsgId={highlightedMsgId}
              onReply={setReplyTo}
              onEdit={handleEditStart}
              onDelete={handleDelete}
              onPin={handleTogglePin}
              onForward={handleForward}
              onCopy={handleCopy}
              scrollToOriginal={(replyId) => {
                const el = document.getElementById(`msg-${replyId}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  setHighlightedMsgId(replyId);
                  setTimeout(() => setHighlightedMsgId(null), 2000);
                }
              }}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>


      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-base-200 border-t border-white/5 flex flex-col gap-2 relative">
        {/* REPLY PREVIEW */}
        {replyTo && (
          <div className="flex items-center gap-3 bg-base-100 p-2 rounded-xl border border-primary/20 animate-in slide-in-from-bottom-2">
            <Reply size={14} className="text-primary ml-2" />
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-bold uppercase opacity-50">Replying to {replyTo.sender === currentUserId ? "yourself" : "peer"}</p>
              <p className="text-xs truncate">{replyTo.text}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="btn btn-circle btn-xs btn-ghost text-base-content/40 hover:text-error">✕</button>
          </div>
        )}

        {/* EDIT PREVIEW */}
        {editingMessage && (
          <div className="flex items-center gap-3 bg-base-100 p-2 rounded-xl border border-warning/20 animate-in slide-in-from-bottom-2">
            <Pencil size={14} className="text-warning ml-2" />
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-bold uppercase opacity-50 text-warning">Editing message</p>
              <p className="text-xs truncate">{editingMessage.text}</p>
            </div>
            <button type="button" onClick={() => { setEditingMessage(null); setInputText(""); }} className="btn btn-circle btn-xs btn-ghost text-base-content/40 hover:text-error">✕</button>
          </div>
        )}

        {pendingFile && (
          <div className="flex items-center gap-3 bg-base-100 p-2 rounded-xl border border-primary/20 animate-in slide-in-from-bottom-2">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Paperclip size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{pendingFile.name}</p>
              <p className="text-xs opacity-50">{(pendingFile.size / 1e6).toFixed(2)} MB</p>
            </div>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="btn btn-circle btn-xs btn-ghost hover:bg-error/20 hover:text-error"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-circle btn-ghost text-base-content/60 hover:text-primary hover:bg-primary/10"
              disabled={isUploading || !!pendingFile}
            >
              <Paperclip size={20} />
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`btn btn-circle btn-ghost ${showEmojiPicker ? 'text-primary bg-primary/10' : 'text-base-content/60'} hover:text-primary hover:bg-primary/10`}
            >
              <Smile size={20} />
            </button>
          </div>

          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full left-4 mb-4 z-50">
              <EmojiPicker
                theme="dark"
                onEmojiClick={onEmojiClick}
                autoFocusSearch={false}
                skinTonesDisabled
                searchDisabled={false}
                width={320}
                height={400}
              />
            </div>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isKeyInitializing ? "Initializing Secure Channel..." :
                isUploading ? "Uploading to Cloud..." :
                  !aesKey ? "Waiting for security keys..." :
                    cryptoError ? "Encryption Sync Error" :
                      "Secure message..."
            }
            className={`input input-bordered flex-1 bg-base-100 focus:outline-none focus:ring-1 shadow-inner ${cryptoError || (!aesKey && !isKeyInitializing) ? 'input-error ring-error/50' : 'focus:ring-primary'}`}
            disabled={isUploading || isKeyInitializing || !aesKey || !!cryptoError}
            aria-label="Secure message input"
          />

          <button
            type="submit"
            disabled={isUploading || isKeyInitializing || !aesKey || !!cryptoError || (!inputText.trim() && !pendingFile)}
            className="btn btn-primary px-4 shadow-xl hover:-translate-y-0.5 transition-all"
          >
            {isUploading ? <LoaderIcon className="animate-spin" size={18} /> : editingMessage ? <Pencil size={18} /> : <Send size={18} />}
          </button>
        </div>
      </form>


      {/* MODALS */}
      <ForwardModal
        isOpen={isForwardModalOpen}
        onClose={() => setIsForwardModalOpen(false)}
        onForward={handleForwardConfirm}
        originalMessage={messageToForward}
      />
    </div>


  );
};

export default SecureChat;
