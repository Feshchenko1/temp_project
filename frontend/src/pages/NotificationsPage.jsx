import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptFriendRequest, rejectFriendRequest, getFriendRequests } from "../lib/api";
import { BellIcon, ClockIcon, MessageSquareIcon, UserCheckIcon, XIcon, CheckIcon } from "lucide-react";
import NoNotificationsFound from "../components/NoNotificationsFound";
import { useNotificationStore } from "../store/useNotificationStore";
import { useEffect } from "react";
import toast from "react-hot-toast";

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const { pendingRequests, removeRequest, fetchRequests } = useNotificationStore();

  const { data: requestHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: getFriendRequests,
  });

  const { mutate: acceptRequestMutation, isPending: isAccepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onMutate: async (requestId) => {
      // 1. Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["friend-requests"] });

      // 2. Snapshot current state
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
    onError: (err, requestId, context) => {
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
      // 5. Invalidate
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["recent-chats"] });
    }
  });

  const { mutate: rejectRequestMutation, isPending: isRejecting } = useMutation({
    mutationFn: rejectFriendRequest,
    onMutate: async (requestId) => {
      // 1. Cancel
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
    onError: (err, requestId, context) => {
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
    }
  });

  const isPending = isAccepting || isRejecting;
  const acceptedRequests = requestHistory?.acceptedReqs || [];
  const displayRequests = requestHistory?.incomingReqs || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl space-y-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
            <p className="text-base-content/60 mt-1">Manage your connections and incoming requests.</p>
          </div>
          {displayRequests.length > 0 && (
            <span className="badge badge-error gap-2 py-4 px-5 font-bold animate-pulse">
              {displayRequests.length} New
            </span>
          )}
        </div>

        {/* PENDING REQUESTS SECTION */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <UserCheckIcon className="h-5 w-5" />
            </div>
            Pending Friend Requests
          </h2>

          {displayRequests.length > 0 ? (
            <div className="grid gap-4">
              {displayRequests.map((request) => (
                <div
                  key={request.id}
                  className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-all duration-300 group shadow-sm hover:shadow-md"
                >
                  <div className="card-body p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5 w-full">
                        <div className="avatar">
                          <div className="w-16 h-16 rounded-2xl ring ring-primary/20 ring-offset-base-100 ring-offset-2 shadow-lg">
                            <img src={request.sender.profilePic} alt={request.sender.fullName} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 text-center sm:text-left">
                          <h3 className="font-bold text-xl truncate">{request.sender.fullName}</h3>
                          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                            {request.sender.instrumentsKnown?.slice(0, 3).map(inst => (
                              <span key={inst} className="badge badge-sm badge-ghost border-base-content/10 font-medium">{inst}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-end sm:pl-4">
                        <button
                          className="btn btn-primary sm:w-32 shadow-md hover:shadow-lg transition-all flex-1 sm:flex-none"
                          onClick={() => acceptRequestMutation(request.id)}
                          disabled={isPending}
                        >
                          <CheckIcon className="size-4" />
                          Accept
                        </button>
                        <button
                          className="btn btn-ghost btn-circle text-base-content/50 hover:bg-error/20 hover:text-error transition-colors"
                          onClick={() => rejectRequestMutation(request.id)}
                          disabled={isPending}
                          title="Reject Request"
                        >
                          <XIcon className="size-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-base-200/50 rounded-3xl p-12 border border-dashed border-base-300 text-center">
              <NoNotificationsFound />
            </div>
          )}
        </section>

        {/* RECENTLY ACCEPTED CONNECTIONS */}
        {acceptedRequests.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 opacity-70">
              <div className="bg-success/10 p-2 rounded-lg text-success">
                <BellIcon className="h-5 w-5" />
              </div>
              Recent New Connections
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {acceptedRequests.map((notification) => (
                <div key={notification.id} className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                  <div className="card-body p-4">
                    <div className="flex items-center gap-4">
                      <div className="avatar">
                        <div className="size-12 rounded-xl ring-2 ring-success/20">
                          <img
                            src={notification.recipient.profilePic}
                            alt={notification.recipient.fullName}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{notification.recipient.fullName}</h3>
                        <p className="text-xs flex items-center gap-1 opacity-60 mt-1">
                          <ClockIcon className="h-3 w-3" />
                          Connected
                        </p>
                      </div>
                      <div className="bg-success/20 p-2 rounded-full text-success">
                        <UserCheckIcon className="size-5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
