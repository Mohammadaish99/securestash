import { useState, useEffect } from "react";
import API from "../api/api";

export default function ShareModal({ item, itemType, currentUser, onClose, onShareUpdated }) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("download");
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCollabs, setFetchingCollabs] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  const isFile = itemType === "file";
  const itemId = item._id;
  const shareLink = `${window.location.origin}/#shared-${itemType}-${itemId}`;

  // Fetch current collaborators
  const fetchCollaborators = async () => {
    try {
      setFetchingCollabs(true);
      const endpoint = isFile
        ? `/shares/file/${itemId}/collaborators`
        : `/shares/folder/${itemId}/collaborators`;
      const res = await API.get(endpoint);
      setCollaborators(res.data.collaborators || []);
    } catch (err) {
      console.warn("Could not fetch collaborators:", err.message);
    } finally {
      setFetchingCollabs(false);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, [itemId, isFile]);

  // Handle Share Submit
  const handleShare = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter a collaborator's email address.");
      return;
    }

    if (email.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim()) {
      setError("You cannot share with yourself.");
      return;
    }

    try {
      setLoading(true);
      const endpoint = isFile
        ? `/shares/file/${itemId}`
        : `/shares/folder/${itemId}`;

      const res = await API.post(endpoint, {
        email: email.trim(),
        permission
      });

      setSuccess(res.data.message || "Shared successfully!");
      setEmail("");
      fetchCollaborators();
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      console.error("Share error:", err);
      setError(err.response?.data?.message || "Failed to share. Please check the email.");
    } finally {
      setLoading(false);
    }
  };

  // Revoke Share
  const handleRevoke = async (shareId, collabName) => {
    const confirmRevoke = window.confirm(`Revoke access for ${collabName}?`);
    if (!confirmRevoke) return;

    try {
      setError("");
      await API.delete(`/shares/${shareId}`);
      setCollaborators((prev) => prev.filter((c) => c._id !== shareId));
      setSuccess(`Access revoked for ${collabName}.`);
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      console.error("Revoke error:", err);
      setError(err.response?.data?.message || "Failed to revoke access.");
    }
  };

  // Copy share link
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto glass-3d rounded-3xl p-4 sm:p-6 text-slate-100 relative">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 icon-3d flex items-center justify-center text-xl sm:text-2xl shrink-0">
              {isFile ? "📄" : "📁"}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
                <span>Share</span>
                <span className="text-blue-400 truncate max-w-[170px] sm:max-w-[220px]">
                  "{isFile ? item.originalName : item.name}"
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {isFile ? "Share file with anyone or invite collaborators" : "Share folder contents"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition text-lg shrink-0 cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <span>✅</span> {success}
          </div>
        )}

        {/* Public Share Link Card (Google Drive Style) */}
        <div className="mt-4 sm:mt-5 p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">🌐</span>
              <span className="text-xs font-bold text-white">Public Share Link</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            Anyone with this link can view and download this {isFile ? "file" : "folder"} directly without creating an account.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareLink}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 select-all outline-none font-mono"
            />
            <button
              onClick={copyShareLink}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
                copied
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
              }`}
            >
              <span>{copied ? "✓ Copied!" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleShare} className="mt-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Invite Workspace Collaborator
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-3 text-slate-500 text-xs">📧</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-3 py-2.5 text-white placeholder-slate-500 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-500"
            >
              <option value="download">Download & View</option>
              <option value="view">View Only</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
            >
              {loading ? "Inviting..." : "Invite"}
            </button>
          </div>
        </form>

        {/* People with access list */}
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            People With Access
          </p>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {/* Owner Row */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || "Y"}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {currentUser?.name || "You"} <span className="text-[10px] text-slate-400 font-normal">(Owner)</span>
                  </p>
                  <p className="text-[10px] text-slate-400">{currentUser?.email}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-800">
                Owner
              </span>
            </div>

            {/* Collaborators List */}
            {fetchingCollabs ? (
              <div className="text-center py-3 text-xs text-slate-500">
                Loading collaborators...
              </div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-2 text-xs text-slate-500 italic">
                No individual collaborators yet. Share the public link above or invite an email!
              </div>
            ) : (
              collaborators.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {c.sharedWith?.name?.charAt(0)?.toUpperCase() || c.invitedEmail?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {c.sharedWith?.name || c.invitedEmail || "Invited User"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {c.sharedWith?.email || c.invitedEmail}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] uppercase font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                      {c.permission === "view" ? "Viewer" : "Editor"}
                    </span>
                    <button
                      onClick={() => handleRevoke(c._id, c.sharedWith?.name || c.invitedEmail || "User")}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-0.5 rounded-lg transition"
                      title="Revoke access"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-xs font-medium text-slate-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
