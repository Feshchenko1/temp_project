import { Navigate, Route, Routes } from "react-router";

import HomePage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import CallPage from "./pages/CallPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import ScoreLibraryPage from "./pages/ScoreLibraryPage.jsx";
import CollaboratorsPage from "./pages/CollaboratorsPage.jsx";
import ProfileSettingsPage from "./pages/ProfileSettingsPage.jsx";

import { Toaster } from "react-hot-toast";

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
  const { setUnreadCounts, incrementCount, clearCount } = useUnreadStore();
  const queryClient = useQueryClient();
  
  // E2EE Identity Healing - background check for missing RSA keys
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
      
      // Fetch initial unread counts & friend requests
      getUnreadCounts().then(setUnreadCounts).catch(console.error);
      fetchRequests();

      // Join all recent chat rooms to receive messages for unread badges
      getRecentChats().then(chats => {
        chats.forEach(chat => socket.emit("join-chat", chat.id));
      }).catch(console.error);
      
      const handleNotification = (data) => {
        if (data.type === "friend_request") {
          incrementUnread();
        }
      };

      const handleReceiveMessage = (message) => {
        // Only increment if we are not the sender
        if (message.senderId !== authUser.id) {
          incrementCount(message.chatId);
          
          // Check if we already have this chat in our local list
          const recentChats = queryClient.getQueryData(["recent-chats"]) || [];
          const chatExists = recentChats.some(c => c.id === message.chatId);

          if (!chatExists) {
            // New chat detected! Re-fetch the list and join the socket room
            queryClient.invalidateQueries(["recent-chats"]);
            socket.emit("join-chat", message.chatId);
          } else {
            // Existing chat - just refresh to update the snippet and timestamp
            queryClient.invalidateQueries(["recent-chats"]);
          }
        }
      };

      const handleMessagesRead = ({ chatId, readerId }) => {
        // If someone else read the messages (or us in another tab)
        if (readerId === authUser.id) {
          clearCount(chatId);
        }
      };

      const handleIncomingCall = (data) => {
        // BUSY LOGIC: If already in call, auto-decline with busy status
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
        // Invalidate recent chats to remove any ghost conversations immediately
        queryClient.invalidateQueries(["recent-chats"]);
      };

      socket.on("new_friend_request", addRequest);
      socket.on("receive_message", handleReceiveMessage);
      socket.on("messagesRead", handleMessagesRead);
      socket.on("call:incoming", handleIncomingCall);
      socket.on("call:cancelled", handleCallCancelled);
      socket.on("user_deleted", handleUserDeleted);

      return () => {
        socket.off("new_friend_request", addRequest);
        socket.off("receive_message", handleReceiveMessage);
        socket.off("messagesRead", handleMessagesRead);
        socket.off("call:incoming", handleIncomingCall);
        socket.off("call:cancelled", handleCallCancelled);
        socket.off("user_deleted", handleUserDeleted);
      };
    } else {
      disconnectSocket();
    }
  }, [authUser, incrementUnread, setUnreadCounts, incrementCount, clearCount, setIncomingCall, cancelIncomingCall, queryClient, fetchRequests, addRequest]);

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

      {/* Global Call UI Components */}
      <IncomingCallModal />

      {/* Global Profile Details Modal */}
      <ProfileModal />
      
      {activeCall && (
        <VideoCallOverlay 
          chatId={activeCall.chatId}
          targetUserId={activeCall.targetUserId}
          currentUserId={authUser.id}
          onEndCall={endCall}
        />
      )}
    </div>
  );
};
export default App;
