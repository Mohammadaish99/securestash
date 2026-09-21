import { useState } from "react";
import API from "../api/api";

function Register({ onLogin, onSuccess }) {
  const [step, setStep] = useState("form"); // "form" | "verify"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [verificationCode, setVerificationCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Strong password requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const strengthScore = [
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial
  ].filter(Boolean).length;

  const isPasswordStrong = strengthScore === 5;
  const passwordsMatch = password && password === confirmPassword;

  // Step 1: Send Registration OTP & Verify Genuine Email
  const handleInitiateRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!hasMinLength) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!hasUppercase) {
      setError("Password must include at least one uppercase letter (A-Z).");
      return;
    }

    if (!hasLowercase) {
      setError("Password must include at least one lowercase letter (a-z).");
      return;
    }

    if (!hasNumber) {
      setError("Password must include at least one number (0-9).");
      return;
    }

    if (!hasSpecial) {
      setError("Password must include at least one special character (!@#$%^&*...).");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/auth/send-register-otp", {
        name: name.trim(),
        email: email.trim(),
        password
      });

      setMessage(response.data.message || "Verification code sent to your Gmail inbox! Please enter the 6-digit code.");
      setStep("verify");
    } catch (err) {
      console.error("Registration initiation error:", err);
      setError(
        err.response?.data?.message ||
          (err.code === "ERR_NETWORK" || err.message === "Network Error"
            ? "Unable to connect to SecureStash server. Please ensure the backend is running."
            : "Registration failed. Please check your details.")
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm 6-Digit Code & Create Account
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!verificationCode.trim() || verificationCode.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/auth/verify-and-register", {
        email: email.trim(),
        code: verificationCode.trim()
      });

      setMessage("Email verified! Account created successfully! Preparing your stash...");

      if (response.data.token) {
        localStorage.setItem("securestash_token", response.data.token);
        localStorage.setItem(
          "securestash_user",
          JSON.stringify(response.data.user)
        );

        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 800);
          return;
        }
      }

      setTimeout(() => {
        onLogin(email);
      }, 1000);

    } catch (err) {
      console.error("OTP verification error:", err);
      setError(err.response?.data?.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] bg-gradient-to-tr from-indigo-600/20 via-blue-600/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-[380px] h-[380px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

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
            Create your private cloud vault with verified email security
          </p>
        </div>

        {/* Glass Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/50">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {step === "form" ? "Create Account" : "Verify Email"}
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {step === "form" ? "Step 1 of 2" : "Step 2 of 2"}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              {step === "form"
                ? "Requires genuine email verification (DNS MX verified)"
                : `Enter the 6-digit verification code sent to ${email}`}
            </p>
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

          {step === "form" ? (
            /* STEP 1 FORM */
            <form onSubmit={handleInitiateRegister} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">👤</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    required
                    autoFocus
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-700/70 pl-11 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Genuine Email Address
                  </label>
                  <span className="text-[10px] text-emerald-400 font-medium">✓ MX Checked</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">📧</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com (real domain)"
                    required
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-700/70 pl-11 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Fake or temporary disposable emails will be rejected automatically.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create strong password"
                    required
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

                {/* Password Strength Meter */}
                {password && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-slate-400">Security Score:</span>
                      <span
                        className={
                          strengthScore <= 2
                            ? "text-red-400"
                            : strengthScore <= 4
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }
                      >
                        {strengthScore <= 2
                          ? "Weak"
                          : strengthScore <= 4
                          ? "Moderate"
                          : "Very Strong (DigiLocker Grade)"}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strengthScore <= 2
                            ? "bg-red-500 w-1/3"
                            : strengthScore <= 4
                            ? "bg-amber-500 w-3/4"
                            : "bg-emerald-500 w-full"
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                      <span className={hasMinLength ? "text-emerald-400" : ""}>
                        {hasMinLength ? "✓" : "○"} 8+ characters
                      </span>
                      <span className={hasUppercase ? "text-emerald-400" : ""}>
                        {hasUppercase ? "✓" : "○"} Uppercase (A-Z)
                      </span>
                      <span className={hasLowercase ? "text-emerald-400" : ""}>
                        {hasLowercase ? "✓" : "○"} Lowercase (a-z)
                      </span>
                      <span className={hasNumber ? "text-emerald-400" : ""}>
                        {hasNumber ? "✓" : "○"} Number (0-9)
                      </span>
                      <span className={`col-span-2 ${hasSpecial ? "text-emerald-400" : ""}`}>
                        {hasSpecial ? "✓" : "○"} Special symbol (!@#$%^&*...)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">🛡️</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-700/70 pl-11 pr-11 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 text-sm"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {confirmPassword && (
                  <p
                    className={`text-xs mt-1 font-medium ${
                      passwordsMatch ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {passwordsMatch ? "✓ Passwords match" : "✕ Passwords do not match"}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isPasswordStrong || !passwordsMatch}
                className="w-full mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Verifying Email Domain...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: VERIFICATION OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📬</span>
                  <p className="font-semibold text-white">Check Your Gmail Inbox</p>
                </div>
                <p className="text-slate-300 text-[12px] leading-relaxed">
                  A 6-digit verification code has been dispatched to: <strong className="text-white font-mono">{email}</strong>
                </p>
                <p className="mt-2 text-[11px] text-blue-300/80">
                  Tip: Check your <strong>Inbox</strong>, <strong>Updates</strong>, or <strong>Spam/Junk</strong> folder. Enter the code below to activate your account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full text-center tracking-[0.3em] font-mono text-2xl font-bold rounded-xl bg-slate-950/60 border border-slate-700/70 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3.5 px-4 shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <>
                    <span>✓ Activate Account & Launch Vault</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
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
                  onClick={handleInitiateRegister}
                  className="text-xs text-blue-400 hover:text-blue-300 transition font-medium"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {/* Switch to Login */}
          <div className="mt-6 text-center pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => onLogin(email)}
                className="font-semibold text-blue-400 hover:text-blue-300 transition underline underline-offset-4"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Security badges */}
        <div className="mt-8 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="text-blue-400">🛡️</span> OWASP Bcrypt Salted
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">🔒</span> Zero-Trust Isolation
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1.5">
            <span className="text-purple-400">✨</span> DNS MX Verified
          </span>
        </div>
      </div>
    </div>
  );
}

export default Register;