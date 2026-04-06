import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import SecureChat from "../components/SecureChat";
import useAuthUser from "../hooks/useAuthUser";
import { getOrCreateChatByUserId } from "../lib/api";
import { Loader2 } from "lucide-react";

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const { authUser } = useAuthUser();
  const [chat, setChat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChat = async () => {
      try {
        setIsLoading(true);
        const data = await getOrCreateChatByUserId(targetUserId);
        setChat(data);
      } catch (err) {
        console.error("Failed to find or create direct chat", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (targetUserId) fetchChat();
  }, [targetUserId]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-error">Chat not found or access denied.</p>
      </div>
    );
  }

  // Identify the target user (the one who is not the current user)
  const targetUser = chat.members.find(m => m.id !== authUser.id);

  return (
    <div className="h-[93vh] max-w-5xl mx-auto p-4 md:p-6 animate-in fade-in zoom-in duration-300">
      <SecureChat 
        chatId={chat.id} 
        currentUserId={authUser.id} 
        targetUserId={targetUser?.id}
        targetUserName={targetUser?.fullName}
      />
    </div>
  );
}

export default ChatPage;
