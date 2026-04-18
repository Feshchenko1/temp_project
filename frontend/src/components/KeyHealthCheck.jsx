import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Key, Download, RefreshCw, AlertCircle } from "lucide-react";
import { getPrivateKey, generateKeyPair, exportPublicKey, savePrivateKey } from "../lib/crypto";
import { updatePublicKey } from "../lib/api";
import toast from "react-hot-toast";

const KeyHealthCheck = ({ userId }) => {
  const [status, setStatus] = useState("checking");
  const [pubKey, setPubKey] = useState(null);

  useEffect(() => {
    checkHealth();
  }, [userId]);

  const checkHealth = async () => {
    try {
      const privKey = await getPrivateKey(userId);
      if (privKey) {
        setStatus("healthy");
      } else {
        setStatus("missing");
      }
    } catch (err) {
      setStatus("error");
    }
  };

  const handleRepair = async () => {
    const confirm = window.confirm(
      "This will generate NEW encryption keys. You will NOT be able to read previous encrypted messages. Proceed?"
    );
    if (!confirm) return;

    setStatus("checking");
    try {
      const pair = await generateKeyPair();
      const pubBase64 = await exportPublicKey(pair.publicKey);
      await savePrivateKey(userId, pair.privateKey);
      await updatePublicKey(pubBase64);
      setPubKey(pubBase64);
      setStatus("healthy");
      toast.success("Security keys regenerated and synced.");
    } catch (err) {
      toast.error("Repair failed");
      setStatus("error");
    }
  };

  return (
    <div className="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between bg-base-300/50">
        <div className="flex items-center gap-3">
          <Key className="text-primary size-5" />
          <h3 className="font-bold text-sm uppercase tracking-wider opacity-80">Security & E2EE</h3>
        </div>
        {status === "healthy" ? (
          <div className="badge badge-success gap-2 py-3 px-4 shadow-sm">
            <ShieldCheck size={14} /> Encrypted
          </div>
        ) : (
          <div className="badge badge-warning gap-2 py-3 px-4 animate-pulse shadow-sm">
            <ShieldAlert size={14} /> Action Required
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {status === "healthy" && (
          <div className="space-y-3">
            <p className="text-sm opacity-80 leading-relaxed">
              Your device is registered for <strong>End-to-End Encryption</strong>. Your private keys are stored securely in your browser's IndexedDB.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-sm btn-outline gap-2" onClick={() => toast.info("Device Backup Coming Soon")}>
                <Download size={14} /> Backup Keys
              </button>
              <button className="btn btn-sm btn-ghost text-error gap-2" onClick={handleRepair}>
                <RefreshCw size={14} /> Regenerate
              </button>
            </div>
          </div>
        )}

        {status === "missing" && (
          <div className="space-y-4">
            <div className="alert alert-warning shadow-sm border-none bg-warning/20">
              <AlertCircle size={20} />
              <div className="text-sm">
                <strong>No Keys Found:</strong> This device cannot participate in E2EE chats yet.
              </div>
            </div>
            <button className="btn btn-primary btn-block gap-2 shadow-lg" onClick={handleRepair}>
              <Key size={18} /> Initialize Security Keys
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="alert alert-error">
            <AlertCircle />
            <span>IndexedDB Error. Check browser permissions.</span>
          </div>
        )}

        <div className="pt-4 border-t border-base-300">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold opacity-40 mb-2">
            <ShieldCheck size={12} /> Privacy Protocol
          </div>
          <p className="text-[11px] opacity-60 italic">
            "Harmonix uses Signal-inspired RSA-2048 and AES-256-GCM encryption. Even our servers cannot read your messages or see your files."
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyHealthCheck;
