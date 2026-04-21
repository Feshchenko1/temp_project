import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CheckCircleIcon, MapPinIcon, UserPlusIcon, XIcon, CheckIcon, BellOffIcon, UserMinusIcon, PinIcon, PinOffIcon } from "lucide-react";
import { useNotificationStore } from "../store/useNotificationStore";
import {
  getOutgoingFriendReqs,
  getRecommendedUsers,
  getRecentChats,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  toggleMuteChat,
  togglePinChatNavbar
} from "../lib/api";

import { capitialize } from "../lib/utils";
import { useContextMenu } from "../hooks/useContextMenu";
import ContextMenu from "../components/ContextMenu";
import toast from "react-hot-toast";
import { useUnreadStore } from "../store/useUnreadStore";
import Select from "react-select";

import UserCard from "../components/UserCard";
import NoFriendsFound from "../components/NoFriendsFound";
import useAuthUser from "../hooks/useAuthUser";

// Basic placeholder options (can be expanded later)
const INSTRUMENT_OPTIONS = ["Piano", "Guitar", "Drums", "Bass", "Vocals", "Violin", "Synthesizer", "Saxophone"].map(i => ({ value: i, label: i }));
const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "German", "Japanese", "Ukrainian"].map(l => ({ value: l, label: l }));

const HomePage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const { pendingRequests, removeRequest } = useNotificationStore();
  const [processingId, setProcessingId] = useState(null);
  const [outgoingRequestsIds, setOutgoingRequestsIds] = useState(new Set());
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  const { unreadCounts } = useUnreadStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [selectedLearning, setSelectedLearning] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setDebouncedLocation(locationQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, locationQuery]);

  const { data: recentChats = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["recent-chats"],
    queryFn: getRecentChats,
  });

  const {
    data: recommendedData,
    isLoading: loadingUsers,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["users", debouncedSearch, debouncedLocation, selectedInstruments, selectedLearning, selectedLanguages],
    queryFn: ({ pageParam }) => getRecommendedUsers({
      pageParam,
      search: debouncedSearch,
      location: debouncedLocation,
      instrument: selectedInstruments.map(i => i.value).join(","),
      learning: selectedLearning.map(i => i.value).join(","),
      language: selectedLanguages.map(l => l.value).join(",")
    }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const recommendedUsers = recommendedData?.pages.flatMap(page => page.users) || [];

  const { data: outgoingFriendReqs } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
  });

  const { mutate: sendRequestMutation } = useMutation({
    mutationFn: (userId) => {
      setProcessingId(userId);
      return sendFriendRequest(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
      setProcessingId(null);
    },
    onError: () => setProcessingId(null)
  });

  const { mutate: acceptMutation } = useMutation({
    mutationFn: ({ requestId, userId }) => {
      setProcessingId(userId);
      return acceptFriendRequest(requestId);
    },
    onMutate: async ({ requestId, userId }) => {
      // 1. Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["friend-requests"] });

      // 2. Snapshot the current state
      const previousStoreRequests = useNotificationStore.getState().pendingRequests;
      const previousQueryData = queryClient.getQueryData(["friend-requests"]);

      // 3. Optimistically update
      removeRequest(requestId); // This triggers the store update + silence period

      if (previousQueryData) {
        queryClient.setQueryData(["friend-requests"], (old) => {
          const newIncoming = (old.incomingReqs || []).filter(req => String(req.id) !== String(requestId));
          return {
            ...old,
            incomingReqs: newIncoming
          };
        });
      }

      return { previousStoreRequests, previousQueryData };
    },
    onSuccess: (data) => {
      toast.success("Friend request accepted!");
      if (data?.chat) {
        queryClient.setQueryData(["recent-chats"], (oldChats) => {
          const currentChats = oldChats || [];
          // Prevent duplicates
          if (currentChats.some(c => c.id === data.chat.id)) return currentChats;
          // Inject at the top of the list
          return [data.chat, ...currentChats];
        });
      }
    },
    onError: (err, { requestId, userId }, context) => {
      // 4. Rollback
      if (context?.previousStoreRequests) {
        useNotificationStore.setState({ pendingRequests: context.previousStoreRequests });
      }
      if (context?.previousQueryData) {
        queryClient.setQueryData(["friend-requests"], context.previousQueryData);
      }
      toast.error("Failed to accept friend request");
    },
    onSettled: () => {
      // 5. Invalidate to sync server state
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
      setProcessingId(null);
    }
  });

  const { mutate: rejectMutation } = useMutation({
    mutationFn: ({ requestId, userId }) => {
      setProcessingId(userId);
      return rejectFriendRequest(requestId);
    },
    onMutate: async ({ requestId, userId }) => {
      // 1. Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["friend-requests"] });

      // 2. Snapshot
      const previousStoreRequests = useNotificationStore.getState().pendingRequests;
      const previousQueryData = queryClient.getQueryData(["friend-requests"]);

      // 3. Optimistic update
      removeRequest(requestId); // This triggers the store update + silence period

      if (previousQueryData) {
        queryClient.setQueryData(["friend-requests"], (old) => {
          const newIncoming = (old.incomingReqs || []).filter(req => String(req.id) !== String(requestId));
          return {
            ...old,
            incomingReqs: newIncoming
          };
        });
      }

      return { previousStoreRequests, previousQueryData };
    },
    onSuccess: () => {
      toast.success("Friend request rejected");
    },
    onError: (err, { requestId, userId }, context) => {
      // 4. Rollback
      if (context?.previousStoreRequests) {
        useNotificationStore.setState({ pendingRequests: context.previousStoreRequests });
      }
      if (context?.previousQueryData) {
        queryClient.setQueryData(["friend-requests"], context.previousQueryData);
      }
      toast.error("Failed to reject friend request");
    },
    onSettled: () => {
      // 5. Invalidate
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      setProcessingId(null);
    }
  });

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "3rem",
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderColor: state.isFocused ? "rgba(255, 255, 255, 0.1)" : "transparent",
      borderRadius: "1rem",
      boxShadow: "none",
      cursor: "pointer",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({
      ...base,
      backgroundColor: "#1d232a",
      borderRadius: "1rem",
      border: "1px solid rgba(255,255,255,0.05)",
      overflow: "hidden"
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? "rgba(255,255,255,0.05)" : "transparent",
      color: state.isFocused ? "#fff" : "rgba(255,255,255,0.6)",
      cursor: "pointer",
    }),
    multiValue: (base) => ({ ...base, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "6px" }),
    multiValueLabel: (base) => ({ ...base, color: "#fff" }),
    input: (base) => ({ ...base, color: "#fff" }),
    placeholder: (base) => ({ ...base, color: "rgba(255,255,255,0.3)" }),
    indicatorSeparator: () => ({ display: "none" })
  };

  useEffect(() => {
    const outgoingIds = new Set();
    if (outgoingFriendReqs && outgoingFriendReqs.length > 0) {
      outgoingFriendReqs.forEach((req) => {
        outgoingIds.add(req.recipient.id);
      });
      setOutgoingRequestsIds(outgoingIds);
    }
  }, [outgoingFriendReqs]);

  const handlePinToggle = async (chatId, isCurrentlyPinned) => {
    closeContextMenu();
    try {
      await togglePinChatNavbar(chatId);
      queryClient.invalidateQueries(["recent-chats"]);
      toast.success(isCurrentlyPinned ? "Unpinned from Navbar" : "Pinned to Navbar");
    } catch (error) {
      toast.error("Failed to update pin status");
    }
  };

  const handleRemoveFriend = async (friendId) => {
    closeContextMenu();
    try {
      await removeFriend(friendId);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Removed friend");
    } catch (err) {
      toast.error("Failed to remove friend");
    }
  };

  const handleMuteToggle = async (chatId) => {
    closeContextMenu();
    const store = useUnreadStore.getState();
    store.toggleMuteOptimistic(chatId);
    try {
      await toggleMuteChat(chatId);
    } catch (error) {
      toast.error("Failed to update mute status");
      store.toggleMuteOptimistic(chatId);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* MAIN CONTENT Area */}
        <div className="lg:col-span-12 space-y-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Friends</h2>
          </div>

          {loadingFriends ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : recentChats.length === 0 ? (
            <NoFriendsFound />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentChats.map((chat) => (
                <UserCard
                  key={chat.id}
                  user={chat.otherMember}
                  chatId={chat.id}
                  isCallActive={chat.isCallActive}
                  onContextMenu={(e, data) => handleContextMenu(e, data)}
                >
                  <Link
                    to={`/collaborators?chatId=${chat.id}`}
                    className="btn btn-primary w-full btn-sm"
                  >
                    Message
                  </Link>
                </UserCard>
              ))}
            </div>
          )}


          <section>
            <div className="mb-6 sm:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Discover Musicians</h2>
                <p className="opacity-70 mb-6">Discover perfect bandmates based on your profile</p>

                {/* FILTER UI */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-base-200/50 p-6 rounded-3xl border border-base-300">
                  <input
                    type="text"
                    placeholder="Search by name..."
                    className="input input-bordered w-full bg-black/20 rounded-2xl border-transparent focus:border-white/10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Search location..."
                    className="input input-bordered w-full bg-black/20 rounded-2xl border-transparent focus:border-white/10"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                  />
                  <Select
                    isMulti
                    options={INSTRUMENT_OPTIONS}
                    styles={customSelectStyles}
                    placeholder="Plays instruments..."
                    value={selectedInstruments}
                    onChange={setSelectedInstruments}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                  <Select
                    isMulti
                    options={INSTRUMENT_OPTIONS}
                    styles={customSelectStyles}
                    placeholder="Wants to learn..."
                    value={selectedLearning}
                    onChange={setSelectedLearning}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                  <Select
                    isMulti
                    options={LANGUAGE_OPTIONS}
                    styles={customSelectStyles}
                    placeholder="Speaks..."
                    value={selectedLanguages}
                    onChange={setSelectedLanguages}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : recommendedUsers.length === 0 ? (
              <div className="card bg-base-200 p-6 text-center">
                <h3 className="font-semibold text-lg mb-2">No recommendations available</h3>
                <p className="text-base-content opacity-70">
                  Check back later for new musicians!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedUsers.map((user) => {
                  const hasRequestBeenSent = outgoingRequestsIds.has(user.id);
                  const incomingReq = pendingRequests.find(req => String(req.sender.id) === String(user.id));
                  const isProcessing = processingId === user.id;

                  return (
                    <UserCard key={user.id} user={user}>
                      {isProcessing ? (
                        <div className="flex gap-2 w-full">
                          <button className="btn btn-primary btn-sm flex-1 font-bold disabled:bg-primary/50" disabled>
                            <span className="loading loading-spinner loading-xs" />
                            Processing...
                          </button>
                        </div>
                      ) : incomingReq ? (
                        <div className="flex gap-2 w-full">
                          <button
                            className="btn btn-primary btn-sm flex-1 font-bold"
                            onClick={() => acceptMutation({ requestId: incomingReq.id, userId: user.id })}
                          >
                            Accept
                          </button>
                          <button
                            className="btn btn-ghost btn-sm border border-base-300 hover:bg-error hover:text-error-content transition-all"
                            onClick={() => rejectMutation({ requestId: incomingReq.id, userId: user.id })}
                          >
                            <XIcon className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          className={`btn w-full btn-sm ${hasRequestBeenSent ? "btn-disabled" : "btn-primary"
                            } `}
                          onClick={() => sendRequestMutation(user.id)}
                          disabled={hasRequestBeenSent || isProcessing}
                        >
                          {hasRequestBeenSent ? (
                            <>
                              <CheckCircleIcon className="size-4 mr-2" />
                              Sent
                            </>
                          ) : isProcessing ? (
                            <>
                              <span className="loading loading-spinner loading-xs mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <UserPlusIcon className="size-4 mr-2" />
                              Connect
                            </>
                          )}
                        </button>
                      )}
                    </UserCard>
                  );
                })}
              </div>
            )}

            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="btn btn-outline btn-primary px-8 rounded-full font-bold"
                >
                  {isFetchingNextPage ? (
                    <><span className="loading loading-spinner loading-sm"></span> Loading...</>
                  ) : "Load More Musicians"}
                </button>
              </div>
            )}
          </section>
        </div>


      </div>

      {contextMenu && contextMenu.data && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu}>
          {(() => {
            const chat = recentChats.find(c => c.id === contextMenu.data.chatId);
            const isPinned = chat?.isPinnedToNavbar;

            return (
              <li>
                <button
                  onClick={() => handlePinToggle(contextMenu.data.chatId, isPinned)}
                  className="flex items-center gap-2"
                >
                  {isPinned ? <PinOffIcon className="size-4" /> : <PinIcon className="size-4" />}
                  {isPinned ? "Unpin from Navbar" : "Pin to Navbar"}
                </button>
              </li>
            );
          })()}
          <li>
            <button
              onClick={() => handleMuteToggle(contextMenu.data.chatId)}
              className="flex items-center gap-2"
            >
              <BellOffIcon className="size-4" />
              {(unreadCounts[contextMenu.data.chatId]?.isMuted) ? "Unmute Notifications" : "Mute Notifications"}
            </button>
          </li>
          <li>
            <button
              onClick={() => handleRemoveFriend(contextMenu.data.user?.id)}
              className="flex items-center gap-2 text-error hover:bg-error/10 hover:text-error"
            >
              <UserMinusIcon className="size-4" />
              Remove Friend
            </button>
          </li>
        </ContextMenu>
      )}
    </div>
  );
};

export default HomePage;
