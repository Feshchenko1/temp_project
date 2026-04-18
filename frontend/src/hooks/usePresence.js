import { useEffect } from "react";
import { useLayoutStore } from "../store/useLayoutStore";
import { connectSocket } from "../lib/socketClient";

const usePresence = (isAuthenticated) => {
  const setOnlineUserIds = useLayoutStore((state) => state.setOnlineUserIds);

  useEffect(() => {
    if (!isAuthenticated) {
      setOnlineUserIds([]);
      return;
    }

    const socket = connectSocket();

    const handleStatusChange = (userIds) => {
      setOnlineUserIds(userIds);
    };

    socket.on("user_status_change", handleStatusChange);

    return () => {
      socket.off("user_status_change", handleStatusChange);
    };
  }, [isAuthenticated, setOnlineUserIds]);
};

export default usePresence;
