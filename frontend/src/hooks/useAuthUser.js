import { useQuery } from "@tanstack/react-query";
import { getAuthUser } from "../lib/api";

const useAuthUser = () => {
  const authUser = useQuery({
    queryKey: ["authUser"],
    queryFn: getAuthUser,
    retry: false, // auth check
    refetchOnWindowFocus: false, // Prevents 401s when switching tabs on login screen
    staleTime: Infinity, // Prevents background polling (auth state is manually managed via mutations)
  });

  return { isLoading: authUser.isLoading, authUser: authUser.data?.user };
};
export default useAuthUser;
