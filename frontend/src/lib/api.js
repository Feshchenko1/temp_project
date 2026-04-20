import { axiosInstance } from "./axios";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};
export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const getRecoveryData = async (email) => {
  const response = await axiosInstance.get(`/auth/recovery-data/${email}`);
  return response.data;
};

export const resetPassword = async (payload) => {
  const response = await axiosInstance.post("/auth/reset-password", payload);
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return null;
    }
    return null;
  }
};

export const completeOnboarding = async (userData) => {
  const response = await axiosInstance.post("/auth/onboarding", userData);
  return response.data;
};

export const updateProfile = async (userData) => {
  const response = await axiosInstance.patch("/users/profile", userData);
  return response.data;
};

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export async function getRecommendedUsers() {
  const response = await axiosInstance.get("/users");
  return response.data;
}

export async function getUserById(userId) {
  const response = await axiosInstance.get(`/users/${userId}`);
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function rejectFriendRequest(requestId) {
  const response = await axiosInstance.delete(`/users/friend-request/${requestId}/reject`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chats/token");
  return response.data;
}

export async function uploadFileDirectly(file) {
  if (!file) throw new Error("No file provided");

  const res = await axiosInstance.post("/upload/presigned-url", {
    filename: file.name,
    fileType: file.type
  });

  const { presignedUrl, fileUrl } = res.data;

  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type
    }
  });

  if (!uploadRes.ok) {
    throw new Error(`Cloud upload failed: ${uploadRes.statusText}`);
  }

  return { 
    fileUrl, 
    originalName: res.data.originalName || file.name 
  };
}

export async function getChatDetails(chatId) {
  const response = await axiosInstance.get(`/chats/${chatId}`);
  return response.data;
}

export async function getOrCreateChatByUserId(targetUserId) {
  const response = await axiosInstance.get(`/chats/direct/${targetUserId}`);
  return response.data;
}

export async function createGroupChat(payload) {
  const response = await axiosInstance.post("/chats/group", payload);
  return response.data;
}

export async function getRecentChats() {
  const response = await axiosInstance.get("/chats/recent");
  return response.data;
}

export async function getChatMessages(chatId) {
  const response = await axiosInstance.get(`/chats/${chatId}/messages`);
  return response.data;
}

export async function deleteMessage(msgId) {
  const response = await axiosInstance.delete(`/chats/messages/${msgId}`);
  return response.data;
}

export async function updateMessage(msgId, content) {
  const response = await axiosInstance.patch(`/chats/messages/${msgId}`, { content });
  return response.data;
}

export async function togglePinMessage(msgId) {
  const response = await axiosInstance.patch(`/chats/messages/${msgId}/pin`);
  return response.data;
}

export async function endChatSession(chatId) {
  const response = await axiosInstance.delete(`/chats/session/${chatId}`);
  return response.data;
}

export async function updatePublicKey(publicKey) {
  const response = await axiosInstance.patch("/users/public-key", { publicKey });
  return response.data;
}

export async function getGroupKeys(chatId) {
  const response = await axiosInstance.get(`/chats/keys/${chatId}`);
  return response.data;
}

export async function storeGroupKeys(chatId, keys) {
  const response = await axiosInstance.post("/chats/keys", { chatId, keys });
  return response.data;
}

export async function deleteAccount() {
  const response = await axiosInstance.delete("/users/profile");
  return response.data;
}

export async function getUnreadCounts() {
  const response = await axiosInstance.get("/chats/unread-counts");
  return response.data;
}

export async function markChatAsRead(chatId) {
  const response = await axiosInstance.put(`/chats/${chatId}/read`);
  return response.data;
}

export async function toggleMuteChat(chatId) {
  const response = await axiosInstance.put(`/chats/${chatId}/mute`);
  return response.data;
}

export async function togglePinChatNavbar(chatId) {
  const response = await axiosInstance.put(`/chats/${chatId}/pin-navbar`);
  return response.data;
}

export async function leaveChat(chatId) {
  const response = await axiosInstance.delete(`/chats/${chatId}/leave`);
  return response.data;
}

export async function addGroupMembers(chatId, payload) {
  const response = await axiosInstance.post(`/chats/${chatId}/members`, payload);
  return response.data;
}

export async function removeGroupMember(chatId, memberId) {
  const response = await axiosInstance.delete(`/chats/${chatId}/members/${memberId}`);
  return response.data;
}

export async function removeFriend(friendId) {
  const response = await axiosInstance.delete(`/users/friends/${friendId}`);
  return response.data;
}

export async function updateGroupDetails(chatId, payload) {
  const response = await axiosInstance.put(`/chats/${chatId}/details`, payload);
  return response.data;
}

