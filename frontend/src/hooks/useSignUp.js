import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signup } from "../lib/api";
import { generateKeyPair, wrapPrivateKey, savePrivateKey, clearCryptoDatabase, exportPublicKey } from "../lib/crypto";

const useSignUp = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (signupData) => {
      // 0. PURGE STATE: Before signing up, ensure we have a clean slate locally.
      // This prevents "Zombie Keys" if a user previously deleted an account but didn't wipe IDB.
      console.log("[E2EE] Purging local crypto state before fresh registration...");
      await clearCryptoDatabase();

      try {
        // 1. Generate E2EE Identity (Returns { publicKey, privateKey })
        const keyPair = await generateKeyPair();
        const { publicKey, privateKey } = keyPair;
        
        // 2. Wrap Private Key into a Vault using the plaintext password
        const { encryptedKey, salt } = await wrapPrivateKey(privateKey, signupData.password);
        
        // 3. SERIALIZE PUBLIC KEY: The backend expects a string.
        // WebCrypto objects serialize to {} by default, so we must export to JWK first.
        const publicKeyString = await exportPublicKey(publicKey);

        // 4. Send signup request with Serialized Public Key and Vault
        // This returns the created user, including the server-generated 'id'
        const responseData = await signup({
          ...signupData,
          publicKey: publicKeyString,
          encryptedPrivateKey: encryptedKey,
          cryptoSalt: salt
        });

        // 5. EXTRACT AND VALIDATE USER ID:
        // The backend returns { success: true, user: { id: "..." } }
        const userId = responseData.id || responseData.user?.id;

        if (!userId) {
          console.error("[E2EE] Signup response missing ID:", responseData);
          throw new Error("Backend did not return a valid user ID upon signup.");
        }

        // 6. Save Private Key locally to IndexedDB using the valid server 'userId'
        // CRITICAL FIX: Ensure correct (userId, privateKey) argument ordering
        console.log(`[E2EE] Identity verified for ${userId}. Indexing private key...`);
        await savePrivateKey(userId, privateKey);

        return responseData;
      } catch (cryptoError) {
        console.error("[E2EE] Vault generation or registration failed:", cryptoError);
        throw cryptoError; // Re-throw to be caught by React Query's error state
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
  });

  return { isPending, error, signupMutation: mutate };
};
export default useSignUp;
