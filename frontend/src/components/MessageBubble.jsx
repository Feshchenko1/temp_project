import React, { useState, useEffect, useRef } from "react";
import { LoaderIcon, Paperclip, Lock, Pin, Reply as ReplyIcon, Copy, ArrowRight, Pencil, Trash2, PinOff } from "lucide-react";
import { decryptMessage } from "../lib/crypto";
import MessageAttachment from "./MessageAttachment";

const MessageBubble = ({
  message,
  aesKey,
  currentUserId,
  highlightedMsgId,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onForward,
  onCopy,
  scrollToOriginal,
  isGroup
}) => {
  const [decryptedText, setDecryptedText] = useState(message.text || "");
  const [isDecrypting, setIsDecrypting] = useState(!message.text);
  const [decryptedReply, setDecryptedReply] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);

  useEffect(() => {
    if (!aesKey) {
      if (!message.text) setIsDecrypting(true);
      return;
    }

    if (!message.text && message.content) {
      setIsDecrypting(true);
      decryptMessage(aesKey, message.content)
        .then(setDecryptedText)
        .catch(() => setDecryptedText("🔐 [SECURITY_LOCKOUT: Session Integrity Compromised]"))
        .finally(() => setIsDecrypting(false));
    }

    if (message.replyTo?.content) {
      decryptMessage(aesKey, message.replyTo.content)
        .then(setDecryptedReply)
        .catch(() => setDecryptedReply("🔐 [SECURITY_LOCKOUT: Session Integrity Compromised]"));
    }
  }, [message.content, message.text, message.replyTo?.content, aesKey]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };

    const handleScroll = () => {
      if (contextMenu) setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("scroll", handleScroll, true);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("wheel", handleScroll, true);
      window.addEventListener("touchmove", handleScroll, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("wheel", handleScroll, true);
      window.removeEventListener("touchmove", handleScroll, true);
    };
  }, [contextMenu]);

  const handleContextMenu = (e) => {
    e.preventDefault();

    const MENU_WIDTH = 210;
    const MENU_HEIGHT = 280; // Adjusted based on approximate total height of items
    const PADDING = 12; // Gap from the screen edge

    let x = e.clientX;
    let y = e.clientY;

    // Clamp to right edge
    if (x + MENU_WIDTH > window.innerWidth) {
      x = Math.max(PADDING, window.innerWidth - MENU_WIDTH - PADDING);
    }

    // Clamp to bottom edge (This prevents the massive jump)
    if (y + MENU_HEIGHT > window.innerHeight) {
      y = Math.max(PADDING, window.innerHeight - MENU_HEIGHT - PADDING);
    }

    setContextMenu({ x, y });
  };

  const isOwnMessage = message.senderId === currentUserId;
  const isLockout = decryptedText.includes("SECURITY_LOCKOUT");

  return (
    <div id={`msg-${message.id}`} data-id={message.id} className={`chat ${isOwnMessage ? 'chat-end' : 'chat-start'} group/bubble`}>
      {isGroup && !isOwnMessage && (
        <div className="chat-image avatar">
          <div className="w-10 rounded-full border-2 border-primary/20 hover:border-primary transition-colors shadow-lg">
            <img
              src={message.sender?.profilePic || "/avatar.png"}
              alt={message.sender?.fullName || "Member"}
              className="object-cover"
            />
          </div>
        </div>
      )}
      <div
        onContextMenu={handleContextMenu}
        className={`chat-bubble shadow-md cursor-pointer select-none transition-all duration-300 relative group-hover/bubble:shadow-lg ${highlightedMsgId === message.id ? 'ring-4 ring-primary ring-offset-4 ring-offset-base-300 bg-primary/20 scale-[1.01]' : ''
          } ${isOwnMessage ? 'bg-primary text-primary-content' : 'bg-base-200'}`}
      >
        <div className="flex flex-col gap-1">
          {isGroup && !isOwnMessage && (
            <p className="text-[11px] font-bold text-primary mb-1 opacity-90 transition-opacity flex items-center gap-1.5">
              <span className="w-1 h-1 bg-primary rounded-full" />
              {message.sender?.fullName || "Musician"}
            </p>
          )}
          {message.replyTo && (
            <div
              onClick={() => scrollToOriginal(message.replyTo.id)}
              className="bg-black/10 p-2 rounded-lg border-l-4 border-primary mb-1 text-xs opacity-80 backdrop-blur-sm truncate cursor-pointer hover:bg-black/20 transition-colors"
            >
              <p className="font-bold text-[10px] uppercase opacity-50 mb-0.5">
                Replying to {message.replyTo.senderId === currentUserId ? "you" : "peer"}
              </p>
              <div className="truncate">
                {decryptedReply || message.replyTo.text ? (
                  decryptedReply || message.replyTo.text
                ) : message.replyTo.fileUrl ? (
                  <span className="flex items-center gap-1">
                    <span className="text-primary italic">📎 {message.replyTo.originalName || "File"}</span>
                  </span>
                ) : (
                  "[Encrypted Message]"
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {isDecrypting ? (
              <span className="flex items-center gap-2 text-xs opacity-50 italic">
                <LoaderIcon size={12} className="animate-spin" /> Decrypting...
              </span>
            ) : (
              <div className="relative">
                <span className="whitespace-pre-wrap">{decryptedText}</span>
                {message.isEdited && <span className="text-[9px] opacity-40 ml-2 italic">(edited)</span>}
              </div>
            )}

            {message.fileUrl && (
              <div className="mt-1">
                <div className="text-[10px] opacity-60 mb-1 flex items-center gap-1">
                  <Paperclip size={10} /> {message.originalName || "Attachment"}
                </div>
                <MessageAttachment
                  url={message.fileUrl}
                  fileType={message.fileType}
                  originalName={message.originalName}
                />
              </div>
            )}
          </div>
        </div>

        <div className="chat-footer opacity-50 text-[10px] mt-1 flex items-center gap-1 justify-end translate-y-1">
          {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
          {isOwnMessage && (
            <div className="flex items-center ml-1">
              {message.status === "SENDING" ? (
                <LoaderIcon size={8} className="animate-spin" />
              ) : message.status === "READ" ? (
                <span className="flex -space-x-1 text-primary-content brightness-125">
                  <span className="text-[10px] drop-shadow-sm">✓</span>
                  <span className="text-[10px] drop-shadow-sm">✓</span>
                </span>
              ) : (
                <span className="text-[10px]">✓</span>
              )}
            </div>
          )}
          {message.isPinned && <Pin size={10} className="text-primary-content/80 fill-current ml-1" />}
        </div>
      </div>

      {/* Context Menu - Premium Telegram Style */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[1000] bg-base-100/95 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl py-1.5 min-w-[210px] backdrop-blur-2xl animate-in fade-in zoom-in duration-100 flex flex-col overflow-hidden"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button onClick={() => { onReply({ ...message, text: decryptedText }); setContextMenu(null); }} className="flex items-center gap-3 px-4 py-2 hover:bg-primary hover:text-primary-content transition-all duration-200 group/item active:scale-95">
            <ReplyIcon size={16} className="text-primary group-hover/item:text-primary-content transition-colors" />
            <span className="text-sm font-medium">Reply</span>
          </button>

          <button
            onClick={() => { onCopy(decryptedText); setContextMenu(null); }}
            className="flex items-center gap-3 px-4 py-2 hover:bg-primary hover:text-primary-content transition-all duration-200 group/item active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            disabled={isLockout}
          >
            <Copy size={16} className="text-primary group-hover/item:text-primary-content transition-colors" />
            <span className="text-sm font-medium">Copy Decrypted</span>
          </button>

          <button onClick={() => { onForward(message); setContextMenu(null); }} className="flex items-center gap-3 px-4 py-2 hover:bg-primary hover:text-primary-content transition-all duration-200 group/item active:scale-95">
            <ArrowRight size={16} className="text-primary group-hover/item:text-primary-content transition-colors" />
            <span className="text-sm font-medium">Forward</span>
          </button>

          <button onClick={() => { onPin(message.id); setContextMenu(null); }} className="flex items-center gap-3 px-4 py-2 hover:bg-primary hover:text-primary-content transition-all duration-200 group/item active:scale-95">
            {message.isPinned ? <PinOff size={16} className="text-primary group-hover/item:text-primary-content transition-colors" /> : <Pin size={16} className="text-primary group-hover/item:text-primary-content transition-colors" />}
            <span className="text-sm font-medium">{message.isPinned ? "Unpin Message" : "Pin Message"}</span>
          </button>

          <div className="h-px bg-white/5 my-1 mx-2" />

          {isOwnMessage && (
            <>
              <button
                onClick={() => { onEdit({ ...message, text: decryptedText }); setContextMenu(null); }}
                className="flex items-center gap-3 px-4 py-2 hover:bg-warning/10 text-warning transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                disabled={isLockout}
              >
                <Pencil size={16} />
                <span className="text-sm font-medium">Edit Message</span>
              </button>
              <button onClick={() => { onDelete(message.id); setContextMenu(null); }} className="flex items-center gap-3 px-4 py-2 hover:bg-error/10 text-error transition-all active:scale-95">
                <Trash2 size={16} />
                <span className="text-sm font-medium">Delete Permanently</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>

  );
};

export default MessageBubble;
