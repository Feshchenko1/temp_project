import { useState } from "react";
import { HeadphonesIcon, KeyIcon, MailIcon, UserIcon, ShieldAlertIcon, CopyIcon, CheckCircleIcon } from "lucide-react";
import { Link } from "react-router";
import useSignUp from "../hooks/useSignUp";
import { useQueryClient } from "@tanstack/react-query";

const SignUpPage = () => {
  const queryClient = useQueryClient();
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { isPending, error, signupMutation } = useSignUp();

  const handleSignup = (e) => {
    e.preventDefault();
    signupMutation(signupData, {
      onSuccess: (data) => {
        setRecoveryKey(data.recoveryKey);
        setShowRecoveryModal(true);
      }
    });
  };

  const finalizeSignup = () => {
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (showRecoveryModal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-base-100 selection:bg-primary/30">
        <div className="w-full max-w-2xl mx-auto flex flex-col bg-base-200/50 backdrop-blur-xl border border-error/20 shadow-2xl shadow-error/10 rounded-2xl overflow-hidden p-8 sm:p-12 text-center relative">

          <div className="mx-auto bg-error/10 text-error p-4 rounded-full mb-6">
            <ShieldAlertIcon className="size-12" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-base-content mb-4">Save Your Recovery Key</h2>

          <p className="text-base-content/80 mb-8 max-w-lg mx-auto text-lg">
            This is the <strong>ONLY</strong> way to recover your encrypted messages if you forget your password. Harmonix uses a Zero-Knowledge architecture, meaning we cannot reset your password for you.
          </p>

          <div className="bg-base-300/50 border border-base-content/10 rounded-xl p-6 mb-8 flex flex-col items-center gap-4 relative group">
            <span className="font-mono text-2xl tracking-widest font-bold text-primary select-all">
              {recoveryKey}
            </span>
            <button
              onClick={handleCopy}
              className="btn btn-sm btn-ghost absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity"
            >
              {copied ? <CheckCircleIcon className="size-4 text-success" /> : <CopyIcon className="size-4" />}
            </button>
          </div>

          <div className="alert alert-warning shadow-sm border-warning/50 bg-warning/10 text-base-content mb-8 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>If you lose this key and your password, your account and all conversations will be permanently lost.</span>
          </div>

          <button
            onClick={finalizeSignup}
            className="btn btn-primary btn-lg w-full shadow-lg shadow-primary/20 font-bold"
          >
            I have saved it securely, take me to Harmonix
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-base-100 selection:bg-primary/30">
      <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row-reverse bg-base-200/50 backdrop-blur-xl border border-base-content/10 shadow-2xl rounded-2xl overflow-hidden">

        {/* SIGNUP FORM SECTION */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">

          {/* LOGO */}
          <div className="mb-8 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
              <HeadphonesIcon className="size-8 text-primary shadow-sm" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-base-content to-base-content/60">
              Harmonix
            </span>
          </div>

          <div className="w-full">
            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-base-content">Create Profile</h2>
                <p className="text-base-content/60 mt-1">Configure your new digital workspace.</p>
              </div>

              {/* ERROR MESSAGE DISPLAY */}
              {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm font-medium">
                  {error.response?.data?.message || "Registration failed."}
                </div>
              )}

              <div className="space-y-4">
                <div className="form-control w-full space-y-1.5">
                  <label className="label py-0">
                    <span className="text-sm font-medium text-base-content/80">Full Name</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
                    <input
                      type="text"
                      placeholder="Jimmy Page"
                      className="input input-bordered w-full pl-10 bg-transparent border-base-content/20 focus:border-primary transition-colors"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-control w-full space-y-1.5">
                  <label className="label py-0">
                    <span className="text-sm font-medium text-base-content/80">Email</span>
                  </label>
                  <div className="relative">
                    <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
                    <input
                      type="email"
                      placeholder="producer@harmonix.com"
                      className="input input-bordered w-full pl-10 bg-transparent border-base-content/20 focus:border-primary transition-colors"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-control w-full space-y-1.5">
                  <label className="label py-0">
                    <span className="text-sm font-medium text-base-content/80">Password</span>
                  </label>
                  <div className="relative">
                    <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="input input-bordered w-full pl-10 bg-transparent border-base-content/20 focus:border-primary transition-colors"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                  </div>
                  <p className="text-xs text-base-content/50 ml-1">Requires at least 6 characters.</p>
                </div>

                <div className="form-control mt-2">
                  <label className="cursor-pointer flex items-start gap-3">
                    <input type="checkbox" className="checkbox checkbox-sm checkbox-primary mt-0.5" required />
                    <span className="text-xs text-base-content/70 leading-relaxed">
                      I accept the <Link to="#" className="text-primary hover:underline">Terms of Service</Link> and data <Link to="#" className="text-primary hover:underline">Privacy Policy</Link>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full shadow-lg shadow-primary/20 font-semibold mt-2"
                  disabled={isPending}
                >
                  {isPending ? (
                    <><span className="loading loading-spinner loading-sm"></span> Compiling...</>
                  ) : (
                    "Allocate Workspace"
                  )}
                </button>

                <div className="text-center mt-4">
                  <p className="text-sm text-base-content/70">
                    Active Session?{" "}
                    <Link to="/login" className="font-semibold text-primary hover:text-primary-focus transition-colors hover:underline">
                      Log in
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* HERO SECTION */}
        <div className="hidden lg:flex w-full lg:w-1/2 relative bg-gradient-to-tr from-base-300 to-base-100 items-center justify-center p-12 border-r border-base-content/5">
          <div className="max-w-md relative z-10 space-y-6">
            <div className="bg-base-100/50 p-8 rounded-3xl shadow-xl backdrop-blur-sm border border-base-content/5">
              <h3 className="text-2xl font-bold tracking-tight mb-4">Build Your Portfolio</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-base-content/80">
                  <div className="size-2 rounded-full bg-primary" />
                  Connect with session musicians via WebRTC.
                </li>
                <li className="flex items-center gap-3 text-base-content/80">
                  <div className="size-2 rounded-full bg-secondary" />
                  Exchange hi-res audio over securely signed instances.
                </li>
                <li className="flex items-center gap-3 text-base-content/80">
                  <div className="size-2 rounded-full bg-accent" />
                  Join curated semantic searches for sheets.
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default SignUpPage;
