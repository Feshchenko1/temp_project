import { useEffect } from "react";
import useAuthUser from "./useAuthUser";
import { getPrivateKey, generateAndStoreRSAKeys } from "../lib/crypto";
import { updatePublicKey } from "../lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const useIdentityHealer = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const { mutate: repairIdentity } = useMutation({
    mutationFn: updatePublicKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (err) => {
      toast.error("Cryptographic identity failure. Secure Chat may be degraded.");
    }
  });

  useEffect(() => {
    const heal = async () => {
      if (!authUser || !authUser.id) return;

      try {
        const privateKey = await getPrivateKey(authUser.id);
        
        if (!privateKey) {
          if (authUser.publicKey) {
            return;
          }
          const newPubKey = await generateAndStoreRSAKeys(authUser.id);
          repairIdentity(newPubKey);
        }
      } catch (err) {
      }
    };

    heal();
  }, [authUser, repairIdentity]);
};

export default useIdentityHealer;
