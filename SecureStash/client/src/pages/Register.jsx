import { useState } from "react";
import API from "../api/api";

function Register({ onLogin, onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const handleRegister = async (e) => {
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
      const response = await API.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password
      });

      setMessage("Account created successfully! Preparing your stash...");

      // Store token and user for seamless instant access
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
      console.error("Registration error:", err);
      setError(
        err.response?.data?.message ||
          (err.code === "ERR_NETWORK" || err.message === "Network Error"
            ? "Unable to connect to SecureStash server. Please ensure the server/tunnel is active."
            : "Registration failed. Please check your details.")
      );
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
            Create your private cloud vault with strong encryption
          </p>
        </div>

        {/* Glass Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/50">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Create Account</h2>
            <p className="text-slate-400 text-xs mt-1">
              Start storing, organizing and sharing your files securely
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

          <form onSubmit={handleRegister} className="space-y-4">
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
                  autoCapitalize="words"
                  autoCorrect="off"
                  className="w-full rounded-xl bg-slate-950/60 border border-slate-700/70 pl-11 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition"
                />
              </div>
            </div>

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
                        : "Strong & Compliant"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strengthScore <= 2
                          ? "bg-red-500"
                          : strengthScore <= 4
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${(strengthScore / 5) * 100}%` }}
                    />
                  </div>

                  {/* Requirements grid */}
                  <div className="grid grid-cols-2 gap-1 mt-2.5 text-[11px] text-slate-400">
                    <p className={hasMinLength ? "text-emerald-400 font-medium" : ""}>
                      {hasMinLength ? "✓" : "•"} 8+ characters
                    </p>
                    <p className={hasUppercase ? "text-emerald-400 font-medium" : ""}>
                      {hasUppercase ? "✓" : "•"} 1 uppercase
                    </p>
                    <p className={hasLowercase ? "text-emerald-400 font-medium" : ""}>
                      {hasLowercase ? "✓" : "•"} 1 lowercase
                    </p>
                    <p className={hasNumber ? "text-emerald-400 font-medium" : ""}>
                      {hasNumber ? "✓" : "•"} 1 number
                    </p>
                    <p className={hasSpecial ? "text-emerald-400 font-medium col-span-2" : "col-span-2"}>
                      {hasSpecial ? "✓" : "•"} 1 special symbol (!@#$%^&*...)
                    </p>
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
                  placeholder="Re-enter your password"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
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
                  className={`text-xs mt-1.5 font-medium ${
                    passwordsMatch ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}
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
                    <span className="animate-spin">⏳</span> Creating Vault...
                  </>
                ) : (
                  <>
                    <span>Create Secure Account</span> &rarr;
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer login link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onLogin}
                className="font-semibold text-blue-400 hover:text-blue-300 transition ml-1"
              >
                Sign In &rarr;
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;