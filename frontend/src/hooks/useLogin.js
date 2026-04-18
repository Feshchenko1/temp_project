import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../lib/api";
import { unwrapPrivateKey, savePrivateKey } from "../lib/crypto";

const useLogin = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: async (loginData) => {
      const response = await login(loginData);
      const user = response.user;

      if (user?.encryptedPrivateKey && user?.cryptoSalt) {
        try {
          const privateKey = await unwrapPrivateKey(
            user.encryptedPrivateKey,
            user.cryptoSalt,
            loginData.password
          );
          
          const userId = user.id || user.user?.id;
          if (!userId) {
          } else {
            await savePrivateKey(userId, privateKey);
          }
        } catch (err) {
        }
      }

      return response;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
  });

  return { error, isPending, loginMutation: mutate };
};

export default useLogin;
