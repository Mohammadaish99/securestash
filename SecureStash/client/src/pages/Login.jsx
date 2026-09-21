import { useState } from "react";
import API from "../api/api";

function Login({ onRegister, onSuccess, onForgotPassword, initialEmail = "" }) {
  const [authMethod, setAuthMethod] = useState("password"); // "password" | "otp"
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Passwordless OTP login state
  const [otpStep, setOtpStep] = useState(1); // 1 = Enter email, 2 = Enter code
  const [loginOtp, setLoginOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Standard Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      setLoading(true);
      const response = await API.post("/auth/login", {
        email: email.trim(),
        password
      });

      const token = response.data.token;
      localStorage.setItem("securestash_token", token);
      localStorage.setItem(
        "securestash_user",
        JSON.stringify(response.data.user)
      );

      setMessage("Welcome back! Loading your stash...");

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Passwordless Step 1: Send OTP to Gmail
  const handleSendLoginOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/send-login-otp", {
        email: email.trim()
      });

      setMessage(res.data.message || "A 6-digit login code has been sent to your Gmail inbox!");
      setOtpStep(2);
    } catch (err) {
      console.error("Send login OTP error:", err);
      setError(
        err.response?.data?.message || "Failed to send login code. Please check your email."
      );
    } finally {
      setLoading(false);
    }
  };

  // Passwordless Step 2: Verify OTP & Sign In
  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!loginOtp.trim() || loginOtp.trim().length !== 6) {
      setError("Please enter the complete 6-digit login code.");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/verify-login-otp", {
        email: email.trim(),
        code: loginOtp.trim()
      });

      const token = res.data.token;
      localStorage.setItem("securestash_token", token);
      localStorage.setItem(
        "securestash_user",
        JSON.stringify(res.data.user)
      );

      setMessage("Signed in successfully via Gmail OTP! Loading your stash...");

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (err) {
      console.error("Verify login OTP error:", err);
      setError(
        err.response?.data?.message || "Invalid or expired login code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-[380px] h-[380px] bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/25 mb-4 ring-1 ring-white/20">
            <span className="text-3xl">🔐</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            SecureStash
          </h1>

          <p className="text-slate-400 text-sm mt-2">
            Private, encrypted & public-accessible cloud storage
          </p>
        </div>

        {/* Glassmorphism Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/50">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">Welcome Back</h2>
            <p className="text-slate-400 text-xs mt-1">
              Sign in to manage your private folders and files
            </p>
          </div>

          {/* Auth Method Selector */}
          <div className="flex rounded-xl bg-slate-950/60 p-1 mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("password");
                setError("");
                setMessage("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                authMethod === "password"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🔑</span>
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("otp");
                setError("");
                setMessage("");
                setOtpStep(1);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                authMethod === "otp"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>⚡</span>
              <span>Email OTP (No Password)</span>
            </button>
          </div>

          {/* Alerts */}
          {message && (
            <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2.5 animate-fade-in">
              <span className="text-base shrink-0">✅</span>
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2.5 animate-fade-in">
              <span className="text-base shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: Standard Password Login */}
          {authMethod === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">📧</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoFocus={!initialEmail}
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-700/70 pl-11 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  {onForgotPassword && (
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="text-xs font-medium text-blue-400 hover:text-blue-300 transition"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-700/70 pl-11 pr-11 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 text-sm"
                    tabIndex={-1}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 font-semibold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-600/30 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span> Authenticating...
                    </>
                  ) : (
                    <>
                      <span>Sign In</span> &rarr;
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* TAB 2: Passwordless Login with OTP */
            otpStep === 1 ? (
              <form onSubmit={handleSendLoginOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Your Registered Email
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400">📧</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoFocus
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      className="w-full rounded-xl bg-slate-950/60 border border-slate-700/70 pl-11 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  We will send a 6-digit one-time code to your Gmail inbox so you can log in without typing a password.
                </p>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 font-semibold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-600/30 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span> Sending Code to Gmail...
                    </>
                  ) : (
                    <>
                      <span>Send Login Code</span> &rarr;
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* OTP Step 2 */
              <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📬</span>
                  <p className="font-semibold text-white">Check Your Gmail Inbox</p>
                </div>
                <p className="text-slate-300 text-[12px]">
                  One-time login code dispatched directly to: <strong className="text-white font-mono">{email}</strong>
                </p>
                <p className="mt-1 text-[11px] text-blue-300/80">
                  Please check your Inbox and Spam/Junk folder. Code is valid for 10 minutes.
                </p>
              </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    6-Digit Login Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full text-center tracking-[0.3em] font-mono text-2xl font-bold rounded-xl bg-slate-950/60 border border-slate-700/70 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || loginOtp.length !== 6}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3.5 px-4 shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span> Verifying & Logging In...
                    </>
                  ) : (
                    <>
                      <span>✓ Verify Code & Sign In</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(1);
                      setError("");
                      setMessage("");
                    }}
                    className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
                  >
                    <span>&larr;</span> Change Email
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSendLoginOtp}
                    className="text-xs text-blue-400 hover:text-blue-300 transition font-medium"
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )
          )}

          {/* Footer registration link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Don't have an account yet?{" "}
              <button
                type="button"
                onClick={onRegister}
                className="font-semibold text-blue-400 hover:text-blue-300 transition ml-1"
              >
                Create Account &rarr;
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
