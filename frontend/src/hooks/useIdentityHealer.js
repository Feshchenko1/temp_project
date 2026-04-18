import { useEffect } from "react";
import useAuthUser from "./useAuthUser";
import { getPrivateKey, generateAndStoreRSAKeys } from "../lib/crypto";
import { updatePublicKey } from "../lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

/**
 * useIdentityHealer
 * -----------------
 * Detects if the logged-in user is missing their local RSA identity.
 * If missing, it regenerates the keys and broadcasts the public key to the backend.
 * This resolves issues where IndexDB is cleared or user logs in from a new device.
 */
const useIdentityHealer = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const { mutate: repairIdentity } = useMutation({
    mutationFn: updatePublicKey,
    onSuccess: () => {
      console.log("[E2EE] Identity successfully healed and broadcasted.");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (err) => {
      console.error("[E2EE] Identity healing failed:", err);
      toast.error("Cryptographic identity failure. Secure Chat may be degraded.");
    }
  });

  useEffect(() => {
    const heal = async () => {
      if (!authUser || !authUser.id) return;

      try {
        const privateKey = await getPrivateKey(authUser.id);
        
        // SAFETY CHECK: If local private key is missing
        if (!privateKey) {
          // If the server already has a public key (or vault) for us, 
          // we do NOT auto-heal because generating fresh keys would 
          // permanently break decryption for all previous messages.
          if (authUser.publicKey) {
            console.warn("[E2EE] Identity Gap Detected: Local Private Key is missing, but a Public Key exists on the server.");
            console.warn("[E2EE] Auto-healing blocked. Vault recovery requires a fresh login to unwrap the key from escrow.");
            return;
          }

          // If NO identity exists anywhere, then and only then we generate a new one.
          console.warn("[E2EE] No identity found. Generating new E2EE pair...");
          const newPubKey = await generateAndStoreRSAKeys(authUser.id);
          repairIdentity(newPubKey);
        }
      } catch (err) {
        console.error("[E2EE] Identity check failed:", err);
      }
    };

    heal();
  }, [authUser, repairIdentity]);
};

export default useIdentityHealer;
