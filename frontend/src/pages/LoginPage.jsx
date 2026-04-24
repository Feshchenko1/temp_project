import { useState } from "react";
import { HeadphonesIcon, KeyIcon, MailIcon } from "lucide-react";
import { Link } from "react-router";
import useLogin from "../hooks/useLogin";

const LoginPage = () => {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const { isPending, error, loginMutation } = useLogin();

  const handleLogin = (e) => {
    e.preventDefault();
    loginMutation(loginData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-base-100 selection:bg-primary/30">
      <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row bg-base-200/50 backdrop-blur-xl border border-base-content/10 shadow-2xl rounded-2xl overflow-hidden">
        
        {/* LOGIN FORM SECTION */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          
          {/* LOGO */}
          <div className="mb-10 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
              <HeadphonesIcon className="size-8 text-primary shadow-sm" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-base-content to-base-content/60">
              Harmonix
            </span>
          </div>

          <div className="w-full">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-base-content">Studio Access</h2>
                <p className="text-base-content/60 mt-1">Authenticate to access your workstation.</p>
              </div>

              {/* ERROR MESSAGE DISPLAY */}
              {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm font-medium">
                  {error.response?.data?.message || "Authentication failed."}
                </div>
              )}

              <div className="space-y-4">
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
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
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
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                  <label className="label pt-1 pb-0 justify-end">
                    <Link to="/forgot-password" className="text-xs text-base-content/60 hover:text-primary transition-colors">
                      Forgot Password?
                    </Link>
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary w-full mt-2 font-semibold shadow-lg shadow-primary/20" 
                  disabled={isPending}
                >
                  {isPending ? (
                    <><span className="loading loading-spinner loading-sm"></span> Verifying...</>
                  ) : (
                    "Initialize Session"
                  )}
                </button>

                <div className="text-center pt-2">
                  <p className="text-sm text-base-content/70">
                    New to Harmonix?{" "}
                    <Link to="/signup" className="font-semibold text-primary hover:text-primary-focus transition-colors hover:underline">
                      Create Profile
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* HERO SECTION */}
        <div className="hidden lg:flex w-full lg:w-1/2 relative bg-gradient-to-br from-base-300 to-base-100 items-center justify-center p-12 border-l border-base-content/5">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 mix-blend-overlay"></div>
          <div className="max-w-md relative z-10 text-center space-y-6">
            <div className="bg-base-200 p-6 rounded-3xl shadow-2xl border border-base-content/10 inline-flex flex-col items-center">
              <HeadphonesIcon className="size-24 text-primary opacity-80" />
              <div className="mt-8 space-y-4">
                <h2 className="text-3xl font-extrabold tracking-tight">Sync With The Community</h2>
                <p className="text-base-content/70 text-lg">
                  Join a high-fidelity network of session players, producers, and students.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default LoginPage;
