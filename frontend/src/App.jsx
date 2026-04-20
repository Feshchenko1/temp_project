import { Navigate, Route, Routes, useSearchParams } from "react-router";

import HomePage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import CallPage from "./pages/CallPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import ScoreLibraryPage from "./pages/ScoreLibraryPage.jsx";
import CollaboratorsPage from "./pages/CollaboratorsPage.jsx";
import ProfileSettingsPage from "./pages/ProfileSettingsPage.jsx";

import { Toaster, toast } from "react-hot-toast";

import PageLoader from "./components/PageLoader.jsx";
import useAuthUser from "./hooks/useAuthUser.js";
import Layout from "./components/Layout.jsx";
import { useThemeStore } from "./store/useThemeStore.js";

import { useEffect } from "react";
import { useNotificationStore } from "./store/useNotificationStore.js";
import { connectSocket, disconnectSocket, getSocket } from "./lib/socketClient.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import usePresence from "./hooks/usePresence.js";
import { useCallStore } from "./store/useCallStore.js";
import { useUnreadStore } from "./store/useUnreadStore.js";
import { getUnreadCounts, getRecentChats } from "./lib/api.js";
import IncomingCallModal from "./components/IncomingCallModal.jsx";
import VideoCallOverlay from "./components/VideoCallOverlay.jsx";
import ProfileModal from "./components/ProfileModal.jsx";
import useIdentityHealer from "./hooks/useIdentityHealer.js";


const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();
  const { incrementUnread, fetchRequests, addRequest } = useNotificationStore();
  const { setUnreadCounts, incrementCount, clearCount, setActiveChatId } = useUnreadStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useIdentityHealer();

  const {
    isInCall,
    setIncomingCall,
    cancelIncomingCall,
    endCall,
    activeCall
  } = useCallStore();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  usePresence(isAuthenticated);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (authUser) {
      const socket = connectSocket();

      getUnreadCounts().then(setUnreadCounts).catch(console.error);
      fetchRequests();

      getRecentChats().then(chats => {
        chats.forEach(chat => socket.emit("join-chat", chat.id));
      }).catch(console.error);

      const handleNotification = (data) => {
        if (data.type === "friend_request") {
          incrementUnread();
        }
      };

      const handleReceiveMessage = (message) => {
        if (message.senderId !== authUser.id) {
          incrementCount(message.chatId);

          const { activeChatId } = useUnreadStore.getState();
          if (message.chatId !== activeChatId) {
            queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
          }

          const recentChats = queryClient.getQueryData(["recent-chats"]) || [];
          const chatExists = recentChats.some(c => c.id === message.chatId);
          if (!chatExists) {
            socket.emit("join-chat", message.chatId);
          }
        }
      };

      const handleMessagesRead = ({ chatId, readerId }) => {
        if (readerId === authUser.id) {
          clearCount(chatId);
        }
      };

      const handleIncomingCall = (data) => {
        if (useCallStore.getState().isInCall) {
          socket.emit("call:response", {
            targetUserId: data.fromUserId,
            accepted: false,
            reason: "busy",
            chatId: data.chatId
          });
          return;
        }
        setIncomingCall(data);
      };

      const handleCallCancelled = () => {
        cancelIncomingCall();
      };

      const handleUserDeleted = () => {
        queryClient.invalidateQueries(["recent-chats"]);
      };

      const handleNewGroupChat = (chat) => {
        socket.emit("join-chat", chat.id);
        queryClient.invalidateQueries(["recent-chats"]);
      };

      const handleRemovedFromGroup = ({ chatId }) => {
        queryClient.invalidateQueries(["recent-chats"]);
        toast.error("You have been removed from the group session", { id: "kick-toast-" + chatId });
      };

      const handleGroupSync = () => {
        queryClient.invalidateQueries(["recent-chats"]);
      };
      
      const handleChatDeleted = ({ chatId }) => {
        queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
        const currentChatIdInUrl = searchParams.get("chatId");
        if (currentChatIdInUrl === chatId) {
          setSearchParams({});
          setActiveChatId(null);
          toast.error("You no longer have access to this chat.", { id: "chat-deleted-" + chatId });
        }
      };

      socket.on("new_friend_request", addRequest);
      socket.on("newMessage", handleReceiveMessage);
      socket.on("messagesRead", handleMessagesRead);
      socket.on("call:incoming", handleIncomingCall);
      socket.on("call:cancelled", handleCallCancelled);
      socket.on("user_deleted", handleUserDeleted);
      socket.on("new_group_chat", handleNewGroupChat);
      socket.on("removed_from_group", handleRemovedFromGroup);
      socket.on("group_members_added", handleGroupSync);
      socket.on("group_member_removed", handleGroupSync);
      socket.on("group_details_updated", handleGroupSync);
      socket.on("chat_deleted", handleChatDeleted);

      return () => {
        socket.off("new_friend_request", addRequest);
        socket.off("newMessage", handleReceiveMessage);
        socket.off("messagesRead", handleMessagesRead);
        socket.off("call:incoming", handleIncomingCall);
        socket.off("call:cancelled", handleCallCancelled);
        socket.off("user_deleted", handleUserDeleted);
        socket.off("new_group_chat", handleNewGroupChat);
        socket.off("removed_from_group", handleRemovedFromGroup);
        socket.off("group_members_added", handleGroupSync);
        socket.off("group_member_removed", handleGroupSync);
        socket.off("group_details_updated", handleGroupSync);
        socket.off("chat_deleted", handleChatDeleted);
      };
    } else {
      disconnectSocket();
    }
  }, [authUser, incrementUnread, setUnreadCounts, incrementCount, clearCount, setIncomingCall, cancelIncomingCall, queryClient, fetchRequests, addRequest, searchParams, setSearchParams, setActiveChatId]);

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen flex flex-col">
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <HomePage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            !isAuthenticated ? <SignUpPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
          }
        />
        <Route
          path="/login"
          element={
            !isAuthenticated ? <LoginPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
          }
        />
        <Route
          path="/forgot-password"
          element={
            !isAuthenticated ? <ForgotPasswordPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
          }
        />
        <Route
          path="/notifications"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <NotificationsPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/scores"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <ScoreLibraryPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/collaborators"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <CollaboratorsPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/call/:id"
          element={
            isAuthenticated && isOnboarded ? (
              <CallPage />
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />

        <Route
          path="/chat/:id"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={false}>
                <ChatPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />

        <Route
          path="/profile-settings"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <ProfileSettingsPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
              !isOnboarded ? (
                <OnboardingPage />
              ) : (
                <Navigate to="/" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>

      <Toaster />

      <IncomingCallModal />
      <ProfileModal />

      {activeCall && (
        <VideoCallOverlay
          chatId={activeCall.chatId}
          targetUserId={activeCall.targetUserId}
          targetName={activeCall.targetName}
          currentUserId={authUser.id}
          isGroupCall={activeCall.isGroupCall} // Pass the new flag
          onEndCall={endCall}
        />
      )}
    </div>
  );
};
export default App;
