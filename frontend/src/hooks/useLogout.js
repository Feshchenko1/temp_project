import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../lib/api";
import { clearCryptoDatabase } from "../lib/crypto";


const useLogout = () => {
  const queryClient = useQueryClient();

  const {
    mutate: logoutMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await clearCryptoDatabase();
      queryClient.cancelQueries();
      queryClient.setQueryData(["authUser"], null);
    },

  });

  return { logoutMutation, isPending, error };
};
export default useLogout;
