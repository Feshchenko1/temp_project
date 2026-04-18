import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signup } from "../lib/api";
import { generateKeyPair, wrapPrivateKey, savePrivateKey, clearCryptoDatabase, exportPublicKey, generateRecoveryKey } from "../lib/crypto";

const useSignUp = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (signupData) => {
      await clearCryptoDatabase();

      try {
        const keyPair = await generateKeyPair();
        const { publicKey, privateKey } = keyPair;
        
        const { encryptedKey, salt } = await wrapPrivateKey(privateKey, signupData.password);
        
        const recoveryKey = generateRecoveryKey();
        const { encryptedKey: recoveryEncryptedKey, salt: recoverySalt } = await wrapPrivateKey(privateKey, recoveryKey);

        const publicKeyString = await exportPublicKey(publicKey);
        const responseData = await signup({
          ...signupData,
          publicKey: publicKeyString,
          encryptedPrivateKey: encryptedKey,
          cryptoSalt: salt,
          recoveryEncryptedKey,
          recoverySalt
        });

        const userId = responseData.id || responseData.user?.id;

        if (!userId) {
          throw new Error("Backend did not return a valid user ID upon signup.");
        }

        await savePrivateKey(userId, privateKey);

        return { responseData, recoveryKey };
      } catch (cryptoError) {
        throw cryptoError;
      }
    },
  });

  return { isPending, error, signupMutation: mutate };
};
export default useSignUp;
