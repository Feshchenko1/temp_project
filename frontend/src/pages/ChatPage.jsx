import React from "react";
import SecureChat from "../components/SecureChat";

const ChatPage = () => {
  return (
    <div className="h-[93vh] max-w-5xl mx-auto p-4 md:p-6 animate-in fade-in zoom-in duration-300">
      <SecureChat chatId="demo-chat-uid" currentUserId="mock-current-user-uuid" />
    </div>
  );
};
export default ChatPage;
