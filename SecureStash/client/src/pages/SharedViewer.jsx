import { useState, useEffect } from "react";
import API, { BACKEND_URL } from "../api/api";

export default function SharedViewer({ target, onGoToApp }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const isFile = target?.type === "file";
  const targetId = target?.id;

  useEffect(() => {
    let ignore = false;

    const fetchSharedItem = async () => {
      try {
        setLoading(true);
        setError("");
        const endpoint = isFile
          ? `/shares/public/file/${targetId}`
          : `/shares/public/folder/${targetId}`;

        const res = await API.get(endpoint);

        if (!ignore) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Fetch shared item error:", err);
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              "This shared link is invalid or may have been deleted by the owner."
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    if (targetId) {
      fetchSharedItem();
    }
    return () => {
      ignore = true;
    };
  }, [targetId, isFile]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownload = (fileId) => {
    window.location.href = `${BACKEND_URL}/api/shares/public/download/${fileId}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (mime = "", filename = "") => {
    const ext = filename.split(".").pop().toLowerCase();
    if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "🖼️";
    if (mime === "application/pdf" || ext === "pdf") return "📄";
    if (mime.startsWith("video/") || ["mp4", "mkv", "webm", "mov"].includes(ext)) return "🎬";
    if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "aac"].includes(ext)) return "🎵";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "📦";
    if (["doc", "docx", "txt", "md"].includes(ext)) return "📝";
    return "📁";
  };

  const isImage = (mime = "", filename = "") => {
    const ext = filename.split(".").pop().toLowerCase();
    return mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
  };

  const isPdf = (mime = "", filename = "") => {
    const ext = filename.split(".").pop().toLowerCase();
    return mime === "application/pdf" || ext === "pdf";
  };

  const isAudio = (mime = "", filename = "") => {
    const ext = filename.split(".").pop().toLowerCase();
    return mime.startsWith("audio/") || ["mp3", "wav", "ogg", "aac"].includes(ext);
  };

  const isVideo = (mime = "", filename = "") => {
    const ext = filename.split(".").pop().toLowerCase();
    return mime.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
            🔒
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              SecureStash
            </h1>
            <p className="text-[11px] text-slate-400">Secure & Collaborative File Storage</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={copyLink}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5"
          >
            <span>🔗</span>
            <span>{copied ? "Link Copied!" : "Copy Link"}</span>
          </button>

          <button
            onClick={onGoToApp}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5"
          >
            <span>Open SecureStash</span>
            <span>&rarr;</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-400">Loading shared {isFile ? "file" : "folder"}...</p>
          </div>
        ) : error ? (
          <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-3xl flex items-center justify-center mx-auto mb-4">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Item Unavailable</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">{error}</p>
            <button
              onClick={onGoToApp}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              Go to SecureStash Home
            </button>
          </div>
        ) : isFile && data?.file ? (
          <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Header info */}
            <div className="flex items-start gap-4 pb-6 border-b border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl shrink-0">
                {getFileIcon(data.file.fileType, data.file.originalName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Shared File
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatFileSize(data.file.fileSize)}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white truncate mb-1.5" title={data.file.originalName}>
                  {data.file.originalName}
                </h2>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span>Shared by</span>
                  <span className="font-semibold text-slate-200">{data.file.owner?.name || "Collaborator"}</span>
                  {data.file.owner?.email && (
                    <span className="text-slate-500">({data.file.owner.email})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Preview Section */}
            <div className="py-6">
              {isImage(data.file.fileType, data.file.originalName) ? (
                <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80 flex items-center justify-center p-2">
                  <img
                    src={`${BACKEND_URL}/api/shares/public/preview/${data.file._id}`}
                    alt={data.file.originalName}
                    className="max-h-[420px] w-auto object-contain rounded-xl"
                  />
                </div>
              ) : isPdf(data.file.fileType, data.file.originalName) ? (
                <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80">
                  <iframe
                    src={`${BACKEND_URL}/api/shares/public/preview/${data.file._id}`}
                    title={data.file.originalName}
                    className="w-full h-[450px] border-0"
                  />
                </div>
              ) : isAudio(data.file.fileType, data.file.originalName) ? (
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-3">Audio Stream</p>
                  <audio controls className="w-full" src={`${BACKEND_URL}/api/shares/public/preview/${data.file._id}`} />
                </div>
              ) : isVideo(data.file.fileType, data.file.originalName) ? (
                <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                  <video controls className="w-full max-h-[420px]" src={`${BACKEND_URL}/api/shares/public/preview/${data.file._id}`} />
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-center">
                  <div className="text-4xl mb-3">📄</div>
                  <p className="text-xs font-semibold text-slate-300 mb-1">
                    Direct download available
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Click the download button below to save this file to your device.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => handleDownload(data.file._id)}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📥</span>
                <span>Download File ({formatFileSize(data.file.fileSize)})</span>
              </button>

              <button
                onClick={onGoToApp}
                className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition"
              >
                Sign In to Save
              </button>
            </div>
          </div>
        ) : !isFile && data?.folder ? (
          <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Folder Header */}
            <div className="flex items-start gap-4 pb-6 border-b border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl shrink-0">
                📁
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Shared Folder
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {data.files?.length || 0} items
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white truncate mb-1.5">
                  {data.folder.name}
                </h2>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span>Shared by</span>
                  <span className="font-semibold text-slate-200">{data.folder.owner?.name || "Collaborator"}</span>
                </p>
              </div>
            </div>

            {/* Folder Files List */}
            <div className="py-6">
              {(!data.files || data.files.length === 0) ? (
                <div className="text-center py-10 text-slate-500 text-xs italic">
                  This shared folder is currently empty.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {data.files.map((f) => (
                    <div
                      key={f._id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">
                          {getFileIcon(f.fileType, f.originalName)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {f.originalName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatFileSize(f.fileSize)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownload(f._id)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-semibold transition flex items-center gap-1 shrink-0"
                      >
                        <span>📥</span>
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
