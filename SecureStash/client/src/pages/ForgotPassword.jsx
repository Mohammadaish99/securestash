import { useState } from "react";
import API from "../api/api";

function ForgotPassword({ onBackToLogin }) {
  const [step, setStep] = useState(1); // 1 = Request code, 2 = Verify code & reset
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewCode, setPreviewCode] = useState("");

  // Strong password checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

  const strengthScore = [
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial
  ].filter(Boolean).length;

  const isPasswordStrong = strengthScore === 5;
  const passwordsMatch = newPassword && newPassword === confirmPassword;

  // Step 1: Request Code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      setLoading(true);
      const response = await API.post("/auth/forgot-password", {
        email: email.trim()
      });

      setMessage(response.data.message || "Recovery code generated!");
      if (response.data.resetCode) {
        setPreviewCode(response.data.resetCode);
        setResetCode(response.data.resetCode);
      }
      setStep(2);
    } catch (err) {
      console.error("Forgot Password Error:", err);
      setError(
        err.response?.data?.message || "Failed to generate recovery code."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!isPasswordStrong) {
      setError("Please meet all strong password requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/auth/reset-password", {
        email: email.trim(),
        resetCode: resetCode.trim(),
        newPassword
      });

      setMessage(response.data.message || "Password reset successful!");
      setTimeout(() => {
        onBackToLogin(email);
      }, 2000);
    } catch (err) {
      console.error("Reset Password Error:", err);
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-[350px] h-[350px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/25 mb-4 ring-1 ring-white/20">
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Reset Password
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Securely recover access to your SecureStash vault
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/50">
          {/* Notifications */}
          {message && (
            <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-start gap-2.5 animate-fade-in">
              <span className="text-base shrink-0">✅</span>
              <div>
                <p>{message}</p>
                {previewCode && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-xs font-mono text-emerald-200">
                    Your 6-Digit Recovery Code: <span className="font-bold text-sm tracking-wider text-white">{previewCode}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2.5 animate-fade-in">
              <span className="text-base shrink-0">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* STEP 1: Request Code */}
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Account Email Address
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

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 font-semibold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-600/30 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span> Generating Code...
                  </>
                ) : (
                  <>
                    <span>Send Recovery Code</span> &rarr;
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Verify Code & Set Strong Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* Recovery Code */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  6-Digit Recovery Code
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">🔢</span>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="e.g. 849201"
                    maxLength={6}
                    required
                    autoFocus
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-700/70 pl-11 pr-4 py-3 text-white font-mono tracking-widest placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  New Strong Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create new strong password"
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
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-slate-400">Password Strength:</span>
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
                          : "Strong & Secure"}
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

                    {/* Requirements checklist */}
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">🛡️</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-slate-700 py-3 font-semibold text-slate-300 hover:bg-slate-800 transition text-sm"
                >
                  Change Email
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-600/30 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? "Resetting..." : "Update Password"}
                </button>
              </div>
            </form>
          )}

          {/* Back to login */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <button
              onClick={() => onBackToLogin(email)}
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition flex items-center justify-center gap-1.5 mx-auto"
            >
              <span>&larr;</span> Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
