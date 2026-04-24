import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { KeyIcon, MailIcon, ShieldAlertIcon, CheckCircleIcon, CopyIcon, Loader2Icon, LockIcon } from "lucide-react";
import { getRecoveryData, resetPassword } from "../lib/api";
import { unwrapPrivateKey, wrapPrivateKey, generateRecoveryKey, clearCryptoDatabase } from "../lib/crypto";
import toast from "react-hot-toast";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [recoveryData, setRecoveryData] = useState(null);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [newRecoveryKey, setNewRecoveryKey] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGetRecoveryData = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter your email");

    setIsLoading(true);
    try {
      const data = await getRecoveryData(email);
      setRecoveryData(data);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Recovery unavailable for this email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("New password must be at least 6 characters.");
    if (!recoveryKeyInput.trim()) return toast.error("Please enter your Recovery Key.");

    setIsLoading(true);
    try {
      let privateKey;
      try {
        privateKey = await unwrapPrivateKey(
          recoveryData.recoveryEncryptedKey,
          recoveryData.recoverySalt,
          recoveryKeyInput.trim()
        );
      } catch (unwrapError) {
        throw new Error("Invalid Recovery Key. Decryption failed.");
      }

      if (!privateKey) throw new Error("Invalid Recovery Key.");

      await clearCryptoDatabase();

      const { encryptedKey, salt } = await wrapPrivateKey(privateKey, newPassword);

      const generatedRecoveryKey = generateRecoveryKey();
      const { encryptedKey: newRecoveryEncryptedKey, salt: newRecoverySalt } = await wrapPrivateKey(privateKey, generatedRecoveryKey);

      await resetPassword({
        email,
        newPassword,
        encryptedPrivateKey: encryptedKey,
        cryptoSalt: salt,
        recoveryEncryptedKey: newRecoveryEncryptedKey,
        recoverySalt: newRecoverySalt
      });

      setNewRecoveryKey(generatedRecoveryKey);
      toast.success("Password reset securely.");
      setStep(3);
    } catch (error) {
      toast.error(error.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newRecoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const finalizeReset = () => {
    navigate("/login");
  };

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-base-100 selection:bg-primary/30">
        <div className="w-full max-w-2xl mx-auto flex flex-col bg-base-200/50 backdrop-blur-xl border border-error/20 shadow-2xl shadow-error/10 rounded-2xl overflow-hidden p-8 sm:p-12 text-center relative">

          <div className="mx-auto bg-error/10 text-error p-4 rounded-full mb-6">
            <ShieldAlertIcon className="size-12" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-base-content mb-4">Save Your NEW Recovery Key</h2>

          <p className="text-base-content/80 mb-8 max-w-lg mx-auto text-lg">
            For security, your old recovery key has been permanently invalidated. You <strong>MUST</strong> save this new key to ensure access to your encrypted messages.
          </p>

          <div className="bg-base-300/50 border border-base-content/10 rounded-xl p-6 mb-8 flex flex-col items-center gap-4 relative group">
            <span className="font-mono text-2xl tracking-widest font-bold text-primary select-all">
              {newRecoveryKey}
            </span>
            <button
              onClick={handleCopy}
              className="btn btn-sm btn-ghost absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity"
            >
              {copied ? <CheckCircleIcon className="size-4 text-success" /> : <CopyIcon className="size-4" />}
            </button>
          </div>

          <button
            onClick={finalizeReset}
            className="btn btn-primary btn-lg w-full shadow-lg shadow-primary/20 font-bold"
          >
            I have saved my NEW key securely
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-base-100 selection:bg-primary/30">
      <div className="w-full max-w-md mx-auto flex flex-col bg-base-200/50 backdrop-blur-xl border border-base-content/10 shadow-2xl rounded-2xl overflow-hidden p-8 sm:p-12">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300 shadow-inner">
              <KeyIcon className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mt-4">Account Recovery</h1>
            <p className="text-base-content/60 text-sm">Reset your password natively via E2EE vault</p>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleGetRecoveryData} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email Address</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
                  <MailIcon className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  className={`input input-bordered w-full pl-10 bg-transparent border-base-content/20 focus:border-primary transition-all duration-300 placeholder:text-base-content/30`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full shadow-lg" disabled={isLoading}>
              {isLoading ? <Loader2Icon className="size-5 animate-spin" /> : "Verify Identity"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="alert alert-info shadow-sm bg-info/20 text-base-content text-sm mb-4">
              <ShieldAlertIcon className="w-5 h-5" />
              <span>We located your encrypted vault. Please enter your Recovery Key to unlock it.</span>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Recovery Key</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
                  <KeyIcon className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  className={`input input-bordered w-full pl-10 bg-transparent border-base-content/20 font-mono tracking-widest uppercase focus:border-primary transition-all duration-300`}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={recoveryKeyInput}
                  onChange={(e) => setRecoveryKeyInput(e.target.value.toUpperCase())}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">New Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
                  <LockIcon className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  className={`input input-bordered w-full pl-10 bg-transparent border-base-content/20 focus:border-primary transition-all duration-300`}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full shadow-lg" disabled={isLoading}>
              {isLoading ? <Loader2Icon className="size-5 animate-spin" /> : "Reset Password"}
            </button>
          </form>
        )}

        <div className="text-center mt-8 pt-6 border-t border-base-content/10">
          <p className="text-base-content/60 text-sm">
            Remembered your password?{" "}
            <Link to="/login" className="link link-primary font-medium hover:text-primary-focus transition-colors">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default ForgotPasswordPage;
