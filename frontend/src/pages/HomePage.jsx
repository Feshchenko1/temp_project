import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CheckCircleIcon, MapPinIcon, UserPlusIcon, XIcon, CheckIcon } from "lucide-react";
import { useNotificationStore } from "../store/useNotificationStore";
import {
  getOutgoingFriendReqs,
  getRecommendedUsers,
  getRecentChats,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest
} from "../lib/api";

import { capitialize } from "../lib/utils";

import UserCard from "../components/UserCard";
import NoFriendsFound from "../components/NoFriendsFound";
import useAuthUser from "../hooks/useAuthUser";

const HomePage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const { pendingRequests, removeRequest } = useNotificationStore();
  const [processingId, setProcessingId] = useState(null);
  const [outgoingRequestsIds, setOutgoingRequestsIds] = useState(new Set());

  const { data: recentChats = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["recent-chats"],
    queryFn: getRecentChats,
  });

  const { data: recommendedUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers,
  });

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
    mutationFn: (requestId) => {
      setProcessingId(requestId);
      return acceptFriendRequest(requestId);
    },
    onSuccess: (_, requestId) => {
      removeRequest(requestId);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
      setProcessingId(null);
    },
    onError: () => setProcessingId(null)
  });

  const { mutate: rejectMutation } = useMutation({
    mutationFn: (requestId) => {
      setProcessingId(requestId);
      return rejectFriendRequest(requestId);
    },
    onSuccess: (_, requestId) => {
      removeRequest(requestId);
      setProcessingId(null);
    },
    onError: () => setProcessingId(null)
  });

  useEffect(() => {
    const outgoingIds = new Set();
    if (outgoingFriendReqs && outgoingFriendReqs.length > 0) {
      outgoingFriendReqs.forEach((req) => {
        outgoingIds.add(req.recipient.id);
      });
      setOutgoingRequestsIds(outgoingIds);
    }
  }, [outgoingFriendReqs]);

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
                <UserCard key={chat.id} user={chat.otherMember} chatId={chat.id}>
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Discover Musicians</h2>
                  <p className="opacity-70">
                    Discover perfect bandmates based on your profile
                  </p>
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
                  const incomingReq = pendingRequests.find(req => req.sender.id === user.id);
                  const isProcessing = processingId === user.id || (incomingReq && processingId === incomingReq.id);

                  return (
                    <UserCard key={user.id} user={user}>
                      {incomingReq ? (
                        <div className="flex gap-2 w-full">
                          <button
                            className="btn btn-primary btn-sm flex-1 font-bold"
                            onClick={() => acceptMutation(incomingReq.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? <span className="loading loading-spinner loading-xs" /> : "Accept"}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm border border-base-300 hover:bg-error hover:text-error-content transition-all"
                            onClick={() => rejectMutation(incomingReq.id)}
                            disabled={isProcessing}
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
          </section>
        </div>


      </div>
    </div>
  );
};

export default HomePage;
