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
import AudioLibraryPage from "./pages/AudioLibraryPage.jsx";
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
import GlobalModals from "./components/GlobalModals.jsx";
import useIdentityHealer from "./hooks/useIdentityHealer.js";


const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();
  const { fetchRequests, addRequest } = useNotificationStore();
  const { setUnreadCounts, incrementCount, clearCount, setActiveChatId } = useUnreadStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useIdentityHealer();

  const {
    isInCall,
    setIncomingCall,
    cancelIncomingCall,
    endCall,
    activeCall,
    setActiveChatCalls,
    updateChatCallStatus
  } = useCallStore();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  usePresence(isAuthenticated);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const { data: recentChats } = useQuery({
    queryKey: ["recent-chats"],
    queryFn: getRecentChats,
    enabled: isAuthenticated
  });
  useEffect(() => {
    if (recentChats) {
      const activeCallsFromApi = recentChats.filter(c => c.isCallActive).map(c => c.id);
      const currentActiveInStore = useCallStore.getState().activeChatCalls;

      const isSyncRequired = activeCallsFromApi.length !== currentActiveInStore.length ||
        !activeCallsFromApi.every(id => currentActiveInStore.includes(id));

      if (isSyncRequired) {
        console.log("Safety Sync: Updating call store from API data");
        setActiveChatCalls(activeCallsFromApi);
      }
    }
  }, [recentChats, setActiveChatCalls]);

  useEffect(() => {
    if (authUser) {
      const socket = connectSocket();

      getUnreadCounts().then(setUnreadCounts).catch(console.error);
      fetchRequests();

      getRecentChats().then(chats => {
        chats.forEach(chat => socket.emit("join-chat", chat.id));
        const activeCalls = chats.filter(c => c.isCallActive).map(c => c.id);
        setActiveChatCalls(activeCalls);
      }).catch(console.error);

      const handleReceiveMessage = (message) => {
        const currentAuthUser = queryClient.getQueryData(["authUser"])?.user;
        if (!currentAuthUser) return;

        if (message.senderId !== currentAuthUser.id) {
          useUnreadStore.getState().incrementCount(message.chatId);

          queryClient.setQueryData(["recent-chats"], (oldChats) => {
            if (!oldChats) return oldChats;

            const chatIndex = oldChats.findIndex(c => c.id === message.chatId);
            const updatedChats = [...oldChats];

            if (chatIndex !== -1) {
              const targetChat = { ...updatedChats[chatIndex] };

              targetChat.lastMessage = {
                id: message.id,
                content: message.content,
                createdAt: message.createdAt,
                sender: message.sender,
                chatId: message.chatId
              };
              targetChat.updatedAt = message.createdAt;

              updatedChats.splice(chatIndex, 1);
              updatedChats.unshift(targetChat);
            }

            return updatedChats;
          });

          queryClient.invalidateQueries({
            queryKey: ["recent-chats"],
            refetchType: "none"
          });
          const recentChatsData = queryClient.getQueryData(["recent-chats"]) || [];
          const chatExists = recentChatsData.some(c => c.id === message.chatId);
          if (!chatExists) {
            getSocket()?.emit("join-chat", message.chatId);
          }
        }
      };

      const handleMessagesRead = ({ chatId, readerId }) => {
        const currentAuthUser = queryClient.getQueryData(["authUser"])?.user;
        if (!currentAuthUser) return;

        if (readerId === currentAuthUser.id) {
          useUnreadStore.getState().clearCount(chatId);

          queryClient.invalidateQueries({
            queryKey: ["recent-chats"],
            refetchType: "none"
          });
        }
      };

      const handleIncomingCall = (data) => {
        console.log("FRONTEND: Received call:incoming ->", data);
        if (useCallStore.getState().isInCall) {
          socket.emit("call:response", {
            targetUserId: data.fromUserId,
            accepted: false,
            reason: "busy",
            chatId: data.chatId
          });
          return;
        }
        useCallStore.getState().setIncomingCall(data);
      };

      const handleCallCancelled = ({ chatId }) => {
        console.log("FRONTEND: Received call:cancelled for chat ->", chatId);
        useCallStore.getState().cancelIncomingCall(chatId);
        if (chatId) {
          queryClient.setQueryData(["recent-chats"], (old) => {
            if (!old) return old;
            return old.map(c => c.id === chatId ? { ...c, isCallActive: false, activeCallId: null } : c);
          });
        }
      };

      const handleUserDeleted = () => {
        queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
      };

      const handleNewGroupChat = (chat) => {
        socket.emit("join-chat", chat.id);
        queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
      };

      const handleRemovedFromGroup = ({ chatId }) => {
        queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
        toast.error("You have been removed from the group session", { id: "kick-toast-" + chatId });
      };

      const handleGroupSync = () => {
        queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
      };

      const handleChatDeleted = ({ chatId }) => {
        queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
        const currentChatIdInUrl = new URLSearchParams(window.location.search).get("chatId");
        if (currentChatIdInUrl === chatId) {
          window.history.pushState({}, '', window.location.pathname);
          setActiveChatId(null);
          toast.error("You no longer have access to this chat.", { id: "chat-deleted-" + chatId });
        }
      };

      const handleCallStatusChanged = ({ chatId, isActive, activeCallId }) => {
        console.log("FRONTEND: Received call:status_changed ->", { chatId, isActive, activeCallId });
        useCallStore.getState().updateChatCallStatus(chatId, isActive);

        queryClient.setQueryData(["recent-chats"], (oldChats) => {
          if (!oldChats) return oldChats;
          return oldChats.map(chat =>
            chat.id === chatId
              ? { ...chat, activeCallId: isActive ? activeCallId : null, isCallActive: isActive }
              : chat
          );
        });

        queryClient.invalidateQueries({ queryKey: ["recent-chats"], refetchType: 'none' });
      };

      const handleFriendRequestHandled = () => {
        console.log("FRONTEND: Received friend_request_handled via WebSocket");
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
        queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
        queryClient.invalidateQueries({ queryKey: ["friends"] });
        queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
        queryClient.invalidateQueries({ queryKey: ["users"], exact: false });
      };

      socket.on("new_friend_request", addRequest);
      socket.on("newMessage", handleReceiveMessage);
      socket.on("messagesRead", handleMessagesRead);
      socket.on("call:incoming", handleIncomingCall);
      socket.on("call:cancelled", handleCallCancelled);
      socket.on("call:status_changed", handleCallStatusChanged);
      socket.on("user_deleted", handleUserDeleted);
      socket.on("new_group_chat", handleNewGroupChat);
      socket.on("removed_from_group", handleRemovedFromGroup);
      socket.on("group_sync", handleGroupSync);
      socket.on("chat_deleted", handleChatDeleted);
      socket.on("friend_request_handled", handleFriendRequestHandled);

      return () => {
        socket.off("new_friend_request", addRequest);
        socket.off("newMessage", handleReceiveMessage);
        socket.off("messagesRead", handleMessagesRead);
        socket.off("call:incoming", handleIncomingCall);
        socket.off("call:cancelled", handleCallCancelled);
        socket.off("call:status_changed", handleCallStatusChanged);
        socket.off("user_deleted", handleUserDeleted);
        socket.off("new_group_chat", handleNewGroupChat);
        socket.off("removed_from_group", handleRemovedFromGroup);
        socket.off("group_sync", handleGroupSync);
        socket.off("chat_deleted", handleChatDeleted);
        socket.off("friend_request_handled", handleFriendRequestHandled);
      };
    } else {
      disconnectSocket();
    }
  }, [authUser, queryClient]);

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
          path="/audio-library"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <AudioLibraryPage />
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

      <GlobalModals />
    </div>
  );
};
export default App;
