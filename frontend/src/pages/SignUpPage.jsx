import { useState } from "react";
import { HeadphonesIcon, KeyIcon, MailIcon, UserIcon } from "lucide-react";
import { Link } from "react-router";
import useSignUp from "../hooks/useSignUp";

const SignUpPage = () => {
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { isPending, error, signupMutation } = useSignUp();

  const handleSignup = (e) => {
    e.preventDefault();
    signupMutation(signupData);
  };

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
                      className="input input-bordered w-full pl-10 bg-base-100 focus:border-primary transition-colors"
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
                      className="input input-bordered w-full pl-10 bg-base-100 focus:border-primary transition-colors"
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
                      className="input input-bordered w-full pl-10 bg-base-100 focus:border-primary transition-colors"
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
