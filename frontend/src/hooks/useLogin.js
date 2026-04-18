import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../lib/api";
import { unwrapPrivateKey, savePrivateKey } from "../lib/crypto";

const useLogin = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: async (loginData) => {
      const response = await login(loginData);
      const user = response.user;

      // VAULT UNWRAP: If user has a vault, unwrap it using the password
      if (user?.encryptedPrivateKey && user?.cryptoSalt) {
        console.log("[E2EE] Secure Key Vault detected. Unwrapping...");
        try {
          const privateKey = await unwrapPrivateKey(
            user.encryptedPrivateKey,
            user.cryptoSalt,
            loginData.password
          );
          
          const userId = user.id || user.user?.id;
          if (!userId) {
            console.error("[E2EE] Login response missing User ID. Cannot index identity.");
          } else {
            await savePrivateKey(userId, privateKey);
            console.log(`[E2EE] Private Key restored and mapped to account: ${userId}`);
          }
        } catch (err) {
          console.error("[E2EE] Failed to unwrap vault. Password might be different or vault is corrupted.", err);
          // We don't block login, but the user won't be able to decrypt old messages
        }
      }

      return response;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
  });

  return { error, isPending, loginMutation: mutate };
};

export default useLogin;
