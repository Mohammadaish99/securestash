import { useEffect, useState, useRef, useCallback } from "react";
import API, { BACKEND_URL, API_BASE_URL } from "../api/api";
import ShareModal from "../components/ShareModal";

function Dashboard({ onLogout }) {
  const [activeMenu, setActiveMenu] = useState("My Files");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [sharedFolders, setSharedFolders] = useState([]);
  const [sentShares, setSentShares] = useState([]);
  const [sharedFolderView, setSharedFolderView] = useState(null);
  const [loadingSharedFolder, setLoadingSharedFolder] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null); // null means root
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals & Inputs
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploadingUrl, setUploadingUrl] = useState(false);

  // Collaborative Sharing Modal
  const [shareItem, setShareItem] = useState(null);
  const [shareItemType, setShareItemType] = useState("file");

  // Filters & Views (Notion / Google Drive Style)
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'grid'
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fileInputRef = useRef(null);

  const user = JSON.parse(
    localStorage.getItem("securestash_user") || "null"
  );
  const token = localStorage.getItem("securestash_token");

  // ===============================
  // FETCH DATA
  // ===============================
  const fetchData = useCallback(async () => {
    try {
      if (!token) return;
      const [folderRes, fileRes] = await Promise.all([
        API.get("/folders"),
        API.get("/files")
      ]);
      setFolders(folderRes.data.folders || []);
      setFiles(fileRes.data.files || []);

      // Fetch shared resources
      try {
        const [sharedFileRes, sharedFolderRes, sentRes] = await Promise.all([
          API.get("/shares/files"),
          API.get("/shares/folders"),
          API.get("/shares/sent")
        ]);
        setSharedFiles(sharedFileRes.data.shares || []);
        setSharedFolders(sharedFolderRes.data.shares || []);
        setSentShares(sentRes.data.shares || []);
      } catch (e) {
        console.warn("Shared data fetch warning:", e.message);
      }
    } catch (err) {
      console.error("Dashboard Refresh Error:", err);
    }
  }, [token]);

  useEffect(() => {
    let ignore = false;

    const loadInitialData = async () => {
      if (!token) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      try {
        setError("");
        const [folderRes, fileRes] = await Promise.all([
          API.get("/folders"),
          API.get("/files")
        ]);

        if (!ignore) {
          setFolders(folderRes.data.folders || []);
          setFiles(fileRes.data.files || []);
        }

        try {
          const [sharedFileRes, sharedFolderRes, sentRes] = await Promise.all([
            API.get("/shares/files"),
            API.get("/shares/folders"),
            API.get("/shares/sent")
          ]);
          if (!ignore) {
            setSharedFiles(sharedFileRes.data.shares || []);
            setSharedFolders(sharedFolderRes.data.shares || []);
            setSentShares(sentRes.data.shares || []);
          }
        } catch (e) {
          console.warn("Shared data fetch warning:", e.message);
        }
      } catch (err) {
        console.error("Dashboard Error:", err);
        if (!ignore) {
          if (err.response?.status === 401) {
            setError("Session expired. Please login again.");
          } else {
            setError(
              err.response?.data?.message || "Failed to load files and folders."
            );
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [token]);

  // Clear notifications after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ===============================
  // FILE INPUT CHANGE
  // ===============================
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError("");
    }
  };

  // ===============================
  // CREATE FOLDER
  // ===============================
  const createFolder = async () => {
    if (!folderName.trim()) {
      setError("Please enter a folder name.");
      return;
    }

    try {
      setCreatingFolder(true);
      setError("");

      const response = await API.post("/folders", {
        name: folderName.trim(),
        parentFolder: currentFolder ? currentFolder._id : null
      });

      setFolders((prev) => [response.data.folder, ...prev]);
      setFolderName("");
      setShowFolderModal(false);
      setSuccess(`Folder "${response.data.folder.name}" created successfully.`);
    } catch (err) {
      console.error("Create Folder Error:", err);
      setError(err.response?.data?.message || "Failed to create folder.");
    } finally {
      setCreatingFolder(false);
    }
  };

  // ===============================
  // UPLOAD FILE (LOCAL)
  // ===============================
  const uploadFile = async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    try {
      setUploadingFile(true);
      setError("");

      const formData = new FormData();
      formData.append("file", selectedFile);
      const targetId = uploadTargetFolderId || (currentFolder ? currentFolder._id : null);
      if (targetId) {
        formData.append("folder", targetId);
      }

      const response = await API.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setFiles((prev) => [response.data.file, ...prev]);
      setSuccess(`"${response.data.file.originalName}" uploaded successfully.`);
    } catch (err) {
      console.error("Upload File Error:", err);
      setError(err.response?.data?.message || "Failed to upload file.");
    } finally {
      setUploadingFile(false);
    }
  };

  // ===============================
  // UPLOAD FILE FROM URL
  // ===============================
  const uploadFromUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setError("Please enter a valid file URL.");
      return;
    }

    try {
      setUploadingUrl(true);
      setError("");

      const targetId = uploadTargetFolderId || (currentFolder ? currentFolder._id : null);

      const response = await API.post("/files/upload-url", {
        url: urlInput.trim(),
        folder: targetId || null
      });

      setFiles((prev) => [response.data.file, ...prev]);
      setUrlInput("");
      setShowUrlModal(false);
      setSuccess(`File downloaded and stashed from URL successfully!`);
    } catch (err) {
      console.error("Upload URL Error:", err);
      setError(err.response?.data?.message || "Failed to download file from URL.");
    } finally {
      setUploadingUrl(false);
    }
  };

  // ===============================
  // DELETE FOLDER
  // ===============================
  const deleteFolder = async (folder, e) => {
    if (e) e.stopPropagation();
    const confirmDelete = window.confirm(
      `Are you sure you want to delete folder "${folder.name}"? Files inside will be safely moved to your main stash.`
    );
    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/folders/${folder._id}`);
      setFolders((prev) => prev.filter((f) => f._id !== folder._id));
      if (currentFolder && currentFolder._id === folder._id) {
        setCurrentFolder(null);
      }
      setSuccess(`Folder "${folder.name}" deleted successfully.`);
      fetchData();
    } catch (err) {
      console.error("Delete Folder Error:", err);
      setError(err.response?.data?.message || "Failed to delete folder.");
    }
  };

  // ===============================
  // DELETE FILE / REMOVE RECEIVED SHARE / REVOKE SENT SHARE
  // ===============================
  const deleteFile = async (file) => {
    // 1. If this is a received shared file (someone sent it to me)
    if (file.isSharedWithMe || file.sharedBy) {
      const confirmRemove = window.confirm(
        `Remove "${file.originalName}" from your Shared With Me list?\n(The owner's original file will remain safe)`
      );
      if (!confirmRemove) return;

      try {
        setActionLoadingId(file._id);
        setError("");

        if (file.shareId) {
          await API.delete(`/shares/${file.shareId}`);
        } else {
          await API.delete(`/shares/received/file/${file._id}`);
        }

        setSharedFiles((prev) =>
          prev.filter(
            (s) =>
              (s.file?._id || s.file) !== file._id &&
              s._id !== file.shareId
          )
        );

        if (sharedFolderView) {
          setSharedFolderView((prev) => ({
            ...prev,
            files: (prev?.files || []).filter((f) => f._id !== file._id)
          }));
        }

        setSuccess(`Shared file "${file.originalName}" removed from your stash.`);
      } catch (err) {
        console.error("Remove Shared File Error:", err);
        setError(err.response?.data?.message || "Failed to remove shared file.");
      } finally {
        setActionLoadingId(null);
      }
      return;
    }

    // 2. If this is a sent share (shared by me to someone else)
    if (file.isSentShare) {
      const confirmRevoke = window.confirm(
        `Revoke sharing access for "${file.originalName}"?\n(The collaborator will no longer have access)`
      );
      if (!confirmRevoke) return;

      try {
        setActionLoadingId(file._id);
        setError("");

        if (file.shareId) {
          await API.delete(`/shares/${file.shareId}`);
        }

        setSentShares((prev) => prev.filter((s) => s._id !== file.shareId));
        setSuccess(`Share access revoked for "${file.originalName}".`);
      } catch (err) {
        console.error("Revoke Share Error:", err);
        setError(err.response?.data?.message || "Failed to revoke share.");
      } finally {
        setActionLoadingId(null);
      }
      return;
    }

    // 3. Normal personal file permanent delete
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${file.originalName}"?`
    );
    if (!confirmDelete) return;

    try {
      setActionLoadingId(file._id);
      setError("");

      await API.delete(`/files/${file._id}`);

      setFiles((prev) => prev.filter((f) => f._id !== file._id));
      setSuccess(`File "${file.originalName}" deleted successfully.`);
    } catch (err) {
      console.error("Delete File Error:", err);
      setError(err.response?.data?.message || "Failed to delete file.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ===============================
  // REMOVE RECEIVED SHARED WORKSPACE FOLDER
  // ===============================
  const removeSharedFolder = async (share, e) => {
    if (e) e.stopPropagation();
    const folderName = share?.folder?.name || "this workspace";
    const confirmRemove = window.confirm(
      `Remove shared workspace "${folderName}" from your stash?\n(The owner's original folder will remain safe)`
    );
    if (!confirmRemove) return;

    try {
      setError("");
      const shareId = share?._id;
      const folderId = share?.folder?._id || share?.folder;

      if (shareId) {
        await API.delete(`/shares/${shareId}`);
      } else if (folderId) {
        await API.delete(`/shares/received/folder/${folderId}`);
      }

      setSharedFolders((prev) =>
        prev.filter((s) => s._id !== shareId && (s.folder?._id || s.folder) !== folderId)
      );

      if (
        sharedFolderView &&
        (sharedFolderView.share?._id === shareId ||
          sharedFolderView.folder?._id === folderId)
      ) {
        setSharedFolderView(null);
      }

      setSuccess(`Shared workspace "${folderName}" removed from your stash.`);
    } catch (err) {
      console.error("Remove Shared Folder Error:", err);
      setError(err.response?.data?.message || "Failed to remove shared workspace.");
    }
  };

  // ===============================
  // STAR / FAVORITE TOGGLE
  // ===============================
  const toggleStar = async (file, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await API.patch(`/files/${file._id}/star`);
      setFiles((prev) =>
        prev.map((f) => (f._id === file._id ? { ...f, isStarred: res.data.isStarred } : f))
      );
      setSuccess(res.data.isStarred ? `Starred "${file.originalName}"` : `Unstarred "${file.originalName}"`);
    } catch (err) {
      console.error("Star toggle error:", err);
      setError("Failed to update favorite status.");
    }
  };

  // ===============================
  // DOWNLOAD FILE
  // ===============================
  const downloadFile = async (file) => {
    try {
      setActionLoadingId(file._id);
      setError("");

      const response = await API.get(`/files/download/${file._id}`, {
        responseType: "blob"
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", file.originalName || "download");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download Error:", err);
      if (err.response?.status === 403) {
        setError(err.response?.data?.message || "Download restricted: This file has been shared with View-Only permissions.");
        return;
      }
      const fallbackUrl = `${API_BASE_URL}/files/download/${file._id}?token=${token}`;
      window.open(fallbackUrl, "_blank");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ===============================
  // OPEN SHARED WORKSPACE FOLDER
  // ===============================
  const openSharedFolder = async (folder, share) => {
    try {
      setLoadingSharedFolder(true);
      setError("");
      const res = await API.get(`/shares/folder/${folder._id}/files`);
      setSharedFolderView({
        folder,
        share,
        files: res.data.files || [],
        permission: res.data.permission || share?.permission || "download"
      });
    } catch (err) {
      console.error("Open shared folder error:", err);
      setError(err.response?.data?.message || "Failed to load shared workspace files.");
    } finally {
      setLoadingSharedFolder(false);
    }
  };

  // ===============================
  // PREVIEW / OPEN FILE
  // ===============================
  const openFile = (file) => {
    if (!file._id) return;
    const previewUrl = `${API_BASE_URL}/files/preview/${file._id}?token=${token}`;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  // ===============================
  // STORAGE CALCULATION
  // ===============================
  const totalStorageBytes = 10 * 1024 * 1024 * 1024; // 10 GB limit
  const usedBytes = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
  const usedGB = (usedBytes / (1024 * 1024 * 1024)).toFixed(2);
  const storagePercentage = Math.min(
    100,
    parseFloat(((usedBytes / totalStorageBytes) * 100).toFixed(2))
  );

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Helper for file type category matching
  const matchesCategory = (file, cat) => {
    if (cat === "all") return true;
    const mime = (file.fileType || "").toLowerCase();
    const name = (file.originalName || "").toLowerCase();

    if (cat === "documents") {
      return (
        mime.includes("pdf") ||
        mime.includes("word") ||
        mime.includes("officedocument") ||
        mime.includes("text") ||
        mime.includes("json") ||
        mime.includes("csv") ||
        name.endsWith(".pdf") ||
        name.endsWith(".doc") ||
        name.endsWith(".docx") ||
        name.endsWith(".txt") ||
        name.endsWith(".csv") ||
        name.endsWith(".json") ||
        name.endsWith(".md")
      );
    }
    if (cat === "images") {
      return mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name);
    }
    if (cat === "media") {
      return (
        mime.startsWith("audio/") ||
        mime.startsWith("video/") ||
        /\.(mp4|mp3|wav|mov|avi|webm)$/i.test(name)
      );
    }
    if (cat === "archives") {
      return (
        mime.includes("zip") ||
        mime.includes("rar") ||
        mime.includes("tar") ||
        /\.(zip|rar|tar|gz|7z)$/i.test(name)
      );
    }
    return true;
  };

  // Get icon for file
  const getFileIcon = (file) => {
    const mime = (file.fileType || "").toLowerCase();
    const name = (file.originalName || "").toLowerCase();
    if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name)) return "🖼️";
    if (mime.includes("pdf") || name.endsWith(".pdf")) return "📕";
    if (mime.includes("word") || name.endsWith(".docx") || name.endsWith(".doc")) return "📘";
    if (mime.includes("excel") || mime.includes("spreadsheet") || name.endsWith(".xlsx")) return "📊";
    if (mime.includes("zip") || mime.includes("rar") || /\.(zip|rar|7z)$/i.test(name)) return "🗜️";
    if (mime.startsWith("audio/") || /\.(mp3|wav)$/i.test(name)) return "🎵";
    if (mime.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(name)) return "🎥";
    return "📄";
  };

  // ===============================
  // FILTERING FILES & FOLDERS
  // ===============================
  const filteredFolders = folders.filter((folder) => {
    const matchesSearch = folder.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (currentFolder) {
      return matchesSearch && folder.parentFolder === currentFolder._id;
    }
    return matchesSearch && !folder.parentFolder;
  });

  const getDisplayedFiles = () => {
    let list = files;

    if (activeMenu === "Shared With Me") {
      if (sharedFolderView) {
        list = (sharedFolderView.files || []).map((file) => ({
          ...file,
          sharedBy: sharedFolderView.share?.owner,
          sharePermission: sharedFolderView.permission,
          isSharedWithMe: true,
          shareId: sharedFolderView.share?._id
        }));
      } else {
        list = sharedFiles.map((share) => ({
          ...(share.file || {}),
          sharedBy: share.owner,
          sharePermission: share.permission,
          shareId: share._id,
          isSharedWithMe: true
        })).filter((f) => f._id);
      }
    } else if (activeMenu === "Sent Files") {
      list = sentShares
        .filter((s) => s.file)
        .map((share) => ({
          ...(share.file || {}),
          sentTo: share.sharedWith ? (share.sharedWith.name || share.sharedWith.email) : (share.invitedEmail || "Pending User"),
          sharePermission: share.permission,
          shareId: share._id,
          isSentShare: true
        }))
        .filter((f) => f._id);
    } else if (activeMenu === "Starred") {
      list = files.filter((f) => f.isStarred);
    } else if (activeMenu === "Recent") {
      list = [...files].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    } else if (currentFolder && activeMenu === "My Files") {
      list = files.filter((f) => f.folder === currentFolder._id);
    }

    return list
      .filter((f) => (f.originalName || "").toLowerCase().includes(searchQuery.toLowerCase()))
      .filter((f) => matchesCategory(f, categoryFilter));
  };

  const displayedFiles = getDisplayedFiles();

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ================= SIDEBAR ================= */}
      <aside className="hidden md:flex w-64 bg-slate-950 text-white flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="h-20 flex items-center px-6 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/30">
              <span className="text-xl">🔐</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SecureStash</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Cloud Storage</p>
            </div>
          </div>

          {/* Menu */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => {
                setActiveMenu("My Files");
                setCurrentFolder(null);
                setSharedFolderView(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${
                activeMenu === "My Files"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <span>📁</span> My Files
            </button>

            <button
              onClick={() => {
                setActiveMenu("Shared With Me");
                setCurrentFolder(null);
                setSharedFolderView(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center justify-between ${
                activeMenu === "Shared With Me"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <span>🤝</span> Shared With Me
              </div>
              {(sharedFiles.length + sharedFolders.length) > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                  {sharedFiles.length + sharedFolders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveMenu("Sent Files");
                setCurrentFolder(null);
                setSharedFolderView(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center justify-between ${
                activeMenu === "Sent Files"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <span>📤</span> Sent Files
              </div>
              {sentShares.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {sentShares.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveMenu("Recent");
                setCurrentFolder(null);
                setSharedFolderView(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${
                activeMenu === "Recent"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <span>🕘</span> Recent
            </button>

            <button
              onClick={() => {
                setActiveMenu("Starred");
                setCurrentFolder(null);
                setSharedFolderView(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center justify-between ${
                activeMenu === "Starred"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <span>⭐</span> Starred
              </div>
              {files.filter((f) => f.isStarred).length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {files.filter((f) => f.isStarred).length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Dynamic Storage Bar */}
        <div className="p-4">
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vault Storage</p>
              <span className="text-xs text-blue-400 font-medium">{storagePercentage}%</span>
            </div>

            <p className="text-base font-bold text-white mt-1">
              {usedMB > 1024 ? `${usedGB} GB` : `${usedMB} MB`}{" "}
              <span className="text-slate-500 font-normal">/ 10 GB</span>
            </p>

            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, storagePercentage)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Free plan &bull; {files.length} {files.length === 1 ? "file" : "files"} stored
            </p>
          </div>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* ================= TOP NAVBAR ================= */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
          {/* Search */}
          <div className="w-full max-w-md">
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-400">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files and folders..."
                className="w-full rounded-xl bg-slate-100 pl-11 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition border border-transparent focus:border-blue-300 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle (Grid / List) */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "list" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
                title="List View"
              >
                ☰
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "grid" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
                title="Grid View"
              >
                ▦
              </button>
            </div>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-md shadow-blue-500/20">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {user?.name || "Secure User"}
                </p>
                <p className="text-xs text-slate-400 leading-tight">
                  {user?.email || "Encrypted Account"}
                </p>
              </div>

              <button
                onClick={onLogout}
                className="ml-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* ================= CONTENT SECTION ================= */}
        <section className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* BREADCRUMBS BAR (Google Drive / Notion style) */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => {
                setActiveMenu("My Files");
                setCurrentFolder(null);
              }}
              className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>📁</span> My Stash
            </button>
            {currentFolder && (
              <>
                <span>/</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <span>📂</span> {currentFolder.name}
                </span>
              </>
            )}
            {activeMenu === "Shared With Me" ? (
              <>
                <span>/</span>
                <button
                  onClick={() => setSharedFolderView(null)}
                  className={`font-semibold hover:underline ${sharedFolderView ? "text-blue-600" : "text-slate-800"}`}
                >
                  🤝 Shared With Me
                </button>
                {sharedFolderView && (
                  <>
                    <span>/</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <span>📂</span> {sharedFolderView.folder.name}
                    </span>
                  </>
                )}
              </>
            ) : (
              activeMenu !== "My Files" && (
                <>
                  <span>/</span>
                  <span className="font-semibold text-slate-800">{activeMenu}</span>
                </>
              )
            )}
          </div>

          {/* Top Quick Navigation Tabs (Visible on both Mobile and Desktop) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
            <button
              onClick={() => {
                setActiveMenu("My Files");
                setCurrentFolder(null);
                setSharedFolderView(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 flex items-center gap-2 ${
                activeMenu === "My Files"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <span>📁</span> My Files
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                activeMenu === "My Files" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {files.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveMenu("Shared With Me");
                setCurrentFolder(null);
                setSharedFolderView(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 flex items-center gap-2 ${
                activeMenu === "Shared With Me"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <span>🤝</span> Shared With Me
              {(sharedFiles.length + sharedFolders.length) > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeMenu === "Shared With Me" ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                }`}>
                  {sharedFiles.length + sharedFolders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveMenu("Sent Files");
                setCurrentFolder(null);
                setSharedFolderView(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 flex items-center gap-2 ${
                activeMenu === "Sent Files"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <span>📤</span> Sent Files
              {sentShares.length > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeMenu === "Sent Files" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {sentShares.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveMenu("Starred");
                setCurrentFolder(null);
                setSharedFolderView(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 flex items-center gap-2 ${
                activeMenu === "Starred"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <span>⭐</span> Starred
              {files.filter((f) => f.isStarred).length > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeMenu === "Starred" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                }`}>
                  {files.filter((f) => f.isStarred).length}
                </span>
              )}
            </button>
          </div>

          {/* Shared Files Notification Banner */}
          {(sharedFiles.length + sharedFolders.length) > 0 && activeMenu !== "Shared With Me" && (
            <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-900 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="text-2xl shrink-0">📬</span>
                <div>
                  <p className="font-bold text-sm">
                    You have {sharedFiles.length + sharedFolders.length} shared {sharedFiles.length + sharedFolders.length === 1 ? "item" : "items"} from other users!
                  </p>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Another user has shared files with your account. Switch to Shared With Me to view or download them.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveMenu("Shared With Me");
                  setCurrentFolder(null);
                  setSharedFolderView(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shrink-0 shadow-sm self-start sm:self-auto"
              >
                View Shared Files &rarr;
              </button>
            </div>
          )}

          {/* Heading & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <span>
                  {sharedFolderView
                    ? `📂 ${sharedFolderView.folder.name}`
                    : currentFolder
                    ? `📂 ${currentFolder.name}`
                    : activeMenu === "Starred"
                    ? "⭐ Starred Items"
                    : activeMenu === "Shared With Me"
                    ? "🤝 Shared With Me"
                    : activeMenu === "Sent Files"
                    ? "📤 Sent Files (Shared by Me)"
                    : activeMenu === "Recent"
                    ? "🕘 Recent Files"
                    : "📁 My Files"}
                </span>
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {sharedFolderView
                  ? `Workspace shared by ${sharedFolderView.share?.owner?.name || sharedFolderView.share?.owner?.email || "collaborator"}`
                  : activeMenu === "Shared With Me"
                  ? "Collaborative files and folders shared with your account."
                  : activeMenu === "Sent Files"
                  ? "Files and folders you have shared with other users or invited by email."
                  : activeMenu === "Starred"
                  ? "Quick-access favorite files you have starred."
                  : "Private, encrypted digital vault inspired by DigiLocker and Google Drive."}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => fetchData()}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 transition text-sm flex items-center gap-1.5 shadow-sm"
                title="Refresh Stash"
              >
                <span>🔄</span>
              </button>

              <button
                onClick={() => {
                  setError("");
                  setFolderName("");
                  setShowFolderModal(true);
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 transition text-sm flex items-center gap-2 shadow-sm"
              >
                <span>+</span> New Folder
              </button>

              <button
                onClick={() => {
                  setError("");
                  setUrlInput("");
                  setShowUrlModal(true);
                }}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 font-semibold text-blue-700 hover:bg-blue-100 transition text-sm flex items-center gap-2 shadow-sm"
              >
                <span>🌐</span> From URL
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 font-semibold text-white hover:from-blue-500 hover:to-indigo-500 transition text-sm flex items-center gap-2 shadow-md shadow-blue-500/20"
              >
                <span>⬆</span> Upload File
              </button>
            </div>
          </div>

          {/* ================= SUCCESS BANNER ================= */}
          {success && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 flex items-center justify-between text-sm shadow-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>{success}</span>
              </div>
              <button onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800 font-bold">
                ✕
              </button>
            </div>
          )}

          {/* ================= ERROR BANNER ================= */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 flex items-center justify-between text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
              <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold">
                ✕
              </button>
            </div>
          )}

          {/* ================= SELECTED FILE STAGING CARD ================= */}
          {selectedFile && (
            <div className="mt-6 bg-white rounded-2xl border-2 border-blue-500 p-5 shadow-lg shadow-blue-500/10 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0">
                    📄
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{selectedFile.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</span>
                      <span className="text-xs text-slate-300">&bull;</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-medium">Save to:</span>
                        <select
                          value={uploadTargetFolderId}
                          onChange={(e) => setUploadTargetFolderId(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 shadow-sm"
                        >
                          <option value="">📂 General / Root Stash</option>
                          {folders.map((f) => (
                            <option key={f._id} value={f._id}>
                              📁 {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={uploadFile}
                    disabled={uploadingFile}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 shadow-md shadow-blue-500/20 flex items-center gap-2"
                  >
                    {uploadingFile ? (
                      <>
                        <span className="animate-spin">⏳</span> Uploading...
                      </>
                    ) : (
                      <>
                        <span>⬆</span> Confirm Upload
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= CATEGORY FILTER PILLS (Notion style) ================= */}
          <div className="flex flex-wrap items-center gap-2 mt-6">
            {[
              { id: "all", label: "All Items", icon: "📦" },
              { id: "documents", label: "Documents", icon: "📑" },
              { id: "images", label: "Images", icon: "🖼️" },
              { id: "media", label: "Audio & Video", icon: "🎬" },
              { id: "archives", label: "Archives", icon: "🗜️" }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  categoryFilter === cat.id
                    ? "bg-slate-900 text-white shadow"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* ================= SHARED FOLDERS (In Shared With Me view) ================= */}
          {activeMenu === "Shared With Me" && !sharedFolderView && sharedFolders.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <span>📁 Shared Workspaces</span>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                  {sharedFolders.length}
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedFolders.map((share) => {
                  const folder = share.folder;
                  if (!folder) return null;
                  return (
                    <div
                      key={share._id}
                      onClick={() => openSharedFolder(folder, share)}
                      className="bg-white rounded-2xl border border-indigo-200 p-4 hover:border-indigo-400 hover:shadow-md transition cursor-pointer group relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl group-hover:scale-110 transition">📂</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {share.permission === "view" ? "View Only" : "Can Download"}
                          </span>
                          <button
                            onClick={(e) => removeSharedFolder(share, e)}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition text-xs"
                            title="Remove from Shared With Me"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <h4 className="font-semibold text-slate-800 mt-3 truncate">{folder.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <span>Shared by:</span>
                        <span className="font-medium text-slate-700 truncate">{share.owner?.name || share.owner?.email}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Banner when viewing inside a shared folder */}
          {activeMenu === "Shared With Me" && sharedFolderView && (
            <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-md shadow-indigo-500/20">
                  📂
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-lg">{sharedFolderView.folder.name}</h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 shadow-sm">
                      {sharedFolderView.permission === "view" ? "👁️ View Only" : "📥 Can Download"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Workspace shared by <span className="font-semibold text-slate-700">{sharedFolderView.share?.owner?.name || sharedFolderView.share?.owner?.email || "collaborator"}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => removeSharedFolder(sharedFolderView.share)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition shadow-sm"
                  title="Remove this workspace from your stash"
                >
                  <span>🗑️</span> Remove from My Stash
                </button>
                <button
                  onClick={() => setSharedFolderView(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-indigo-200 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
                >
                  <span>←</span> Back to All Shared
                </button>
              </div>
            </div>
          )}

          {loadingSharedFolder && (
            <div className="mt-8 bg-white rounded-2xl border border-indigo-100 p-8 text-center animate-pulse">
              <span className="text-2xl">⏳</span>
              <p className="text-indigo-600 font-medium text-sm mt-2">Loading shared workspace files...</p>
            </div>
          )}

          {/* ================= MY FOLDERS ================= */}
          {activeMenu === "My Files" && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Folders</h3>
                <span className="text-xs text-slate-400">{filteredFolders.length} folders</span>
              </div>

              {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
                  Loading folders...
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-slate-400 text-sm">
                    {searchQuery ? "No matching folders found." : "No folders created yet. Click '+ New Folder' to organize."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredFolders.map((folder) => {
                    const folderFileCount = files.filter(
                      (f) => f.folder === folder._id
                    ).length;

                    return (
                      <div
                        key={folder._id}
                        onClick={() => {
                          setCurrentFolder(folder);
                          setUploadTargetFolderId(folder._id);
                        }}
                        className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer group relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-3xl group-hover:scale-110 transition">📁</span>
                          <div className="flex items-center gap-1">
                            {/* Share Folder Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareItem(folder);
                                setShareItemType("folder");
                              }}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition text-xs"
                              title="Share Folder Collaboratively"
                            >
                              👥
                            </button>

                            {/* Delete Folder Button */}
                            <button
                              onClick={(e) => deleteFolder(folder, e)}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition text-xs opacity-0 group-hover:opacity-100"
                              title="Delete folder"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <h4 className="font-semibold text-slate-800 mt-3 truncate">{folder.name}</h4>
                        <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
                          <span>{folderFileCount} {folderFileCount === 1 ? "file" : "files"}</span>
                          <span>
                            {folder.createdAt ? new Date(folder.createdAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= FILES LIST / GRID ================= */}
          <div className="mt-8 mb-12">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                {sharedFolderView
                  ? `Files in "${sharedFolderView.folder.name}"`
                  : currentFolder
                  ? `Files in "${currentFolder.name}"`
                  : activeMenu === "Shared With Me"
                  ? "Shared Files (Received)"
                  : activeMenu === "Sent Files"
                  ? "Sent Files (Shared by You)"
                  : "Files"}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {displayedFiles.length} {displayedFiles.length === 1 ? "file" : "files"}
              </span>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                Loading files...
              </div>
            ) : displayedFiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                <div className="text-5xl">📂</div>
                <h3 className="text-base font-semibold text-slate-800 mt-3">No files found</h3>
                <p className="text-slate-500 text-sm mt-1">
                  {searchQuery
                    ? `No files match "${searchQuery}".`
                    : activeMenu === "Shared With Me"
                    ? "No files have been shared with your account yet."
                    : activeMenu === "Sent Files"
                    ? "You haven't sent or shared any files yet. Click 'Send' on any of your files to share!"
                    : "Upload your first file or stash one from a URL."}
                </p>
                {activeMenu !== "Shared With Me" && activeMenu !== "Sent Files" && (
                  <div className="flex justify-center gap-3 mt-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition shadow"
                    >
                      ⬆ Upload from Device
                    </button>
                    <button
                      onClick={() => setShowUrlModal(true)}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      🌐 From URL
                    </button>
                  </div>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedFiles.map((file) => (
                  <div
                    key={file._id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-3xl">{getFileIcon(file)}</span>
                        <div className="flex items-center gap-1">
                          {/* Star Toggle */}
                          <button
                            onClick={(e) => toggleStar(file, e)}
                            className="w-7 h-7 rounded-lg text-xs hover:bg-amber-50 flex items-center justify-center transition"
                            title={file.isStarred ? "Unstar" : "Star"}
                          >
                            {file.isStarred ? "⭐" : "☆"}
                          </button>
                          {/* Share File (Only if owner) */}
                          {!file.sharedBy && (
                            <button
                              onClick={() => {
                                setShareItem(file);
                                setShareItemType("file");
                              }}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition text-xs"
                              title="Share File"
                            >
                              👥
                            </button>
                          )}
                        </div>
                      </div>

                      <h4
                        className="font-semibold text-slate-800 text-sm mt-3 truncate hover:text-blue-600 cursor-pointer"
                        onClick={() => openFile(file)}
                        title={file.originalName}
                      >
                        {file.originalName}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatFileSize(file.fileSize)} &bull; {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ""}
                      </p>
                      {file.sharedBy && (
                        <span className="inline-block text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-medium mt-2">
                          From: {file.sharedBy?.name || file.sharedBy?.email}
                        </span>
                      )}
                      {file.sentTo && (
                        <span className="inline-block text-[10px] bg-sky-50 border border-sky-200 text-sky-700 px-2 py-0.5 rounded-full font-medium mt-2">
                          📤 Sent to: {file.sentTo}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => openFile(file)}
                        className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-center"
                      >
                        Open
                      </button>
                      {!file.sharedBy && !file.isSentShare && (
                        <button
                          onClick={() => {
                            setShareItem(file);
                            setShareItemType("file");
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 text-center flex items-center justify-center gap-1"
                          title="Send or Share file"
                        >
                          <span>👥</span> Send
                        </button>
                      )}
                      {file.sharePermission === "view" ? (
                        <button
                          disabled
                          className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold text-center cursor-not-allowed"
                          title="View-only permission (Download disabled)"
                        >
                          🔒 View Only
                        </button>
                      ) : (
                        <button
                          onClick={() => downloadFile(file)}
                          disabled={actionLoadingId === file._id}
                          className="flex-1 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 text-center disabled:opacity-50"
                        >
                          {actionLoadingId === file._id ? "⏳" : "Download"}
                        </button>
                      )}
                      {/* Delete / Remove Button */}
                      <button
                        onClick={() => deleteFile(file)}
                        disabled={actionLoadingId === file._id}
                        className="w-8 py-1.5 rounded-lg text-red-500 hover:bg-red-50 text-xs text-center transition disabled:opacity-50"
                        title={
                          file.isSharedWithMe || file.sharedBy
                            ? "Remove from Shared With Me"
                            : file.isSentShare
                            ? "Revoke share"
                            : "Delete file"
                        }
                      >
                        {actionLoadingId === file._id ? "⏳" : "🗑️"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {displayedFiles.map((file) => (
                    <div
                      key={file._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 hover:bg-slate-50/80 transition gap-4"
                    >
                      {/* File Icon & Info */}
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-2xl mr-3 shrink-0">
                          {getFileIcon(file)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className="font-semibold text-slate-800 text-sm truncate hover:text-blue-600 cursor-pointer"
                              onClick={() => openFile(file)}
                              title={file.originalName}
                            >
                              {file.originalName}
                            </p>
                            {file.isStarred && (
                              <span className="text-amber-400 text-xs" title="Starred file">
                                ⭐
                              </span>
                            )}
                            {file.sharedBy && (
                              <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                                From: {file.sharedBy?.name || file.sharedBy?.email}
                              </span>
                            )}
                            {file.sentTo && (
                              <span className="text-[10px] bg-sky-50 border border-sky-200 text-sky-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                                📤 Sent to: {file.sentTo}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                            <span>{formatFileSize(file.fileSize)}</span>
                            <span>&bull;</span>
                            <span className="truncate max-w-[150px]">{file.fileType || "File"}</span>
                            <span>&bull;</span>
                            <span>
                              {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ""}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Star Button */}
                        <button
                          onClick={(e) => toggleStar(file, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition text-sm"
                          title={file.isStarred ? "Unstar file" : "Star file"}
                        >
                          {file.isStarred ? "⭐" : "☆"}
                        </button>

                        {/* Share Button (Only if owner) */}
                        {!file.sharedBy && !file.isSentShare && (
                          <button
                            onClick={() => {
                              setShareItem(file);
                              setShareItemType("file");
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition flex items-center gap-1"
                            title="Share file collaboratively"
                          >
                            <span>👥</span> Send / Share
                          </button>
                        )}

                        {/* Preview Button */}
                        <button
                          onClick={() => openFile(file)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-1"
                          title="Open / Preview inline"
                        >
                          <span>👁️</span> Open
                        </button>

                        {/* Download Button */}
                        {file.sharePermission === "view" ? (
                          <button
                            disabled
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-400 cursor-not-allowed flex items-center gap-1"
                            title="View-only permission (Download disabled)"
                          >
                            <span>🔒</span> View Only
                          </button>
                        ) : (
                          <button
                            onClick={() => downloadFile(file)}
                            disabled={actionLoadingId === file._id}
                            className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition flex items-center gap-1 disabled:opacity-50"
                            title="Download file"
                          >
                            {actionLoadingId === file._id ? (
                              <span>⏳</span>
                            ) : (
                              <span>⬇️</span>
                            )}
                            Download
                          </button>
                        )}

                        {/* Delete / Remove Action Button */}
                        <button
                          onClick={() => deleteFile(file)}
                          disabled={actionLoadingId === file._id}
                          className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 transition flex items-center gap-1.5 disabled:opacity-50"
                          title={
                            file.isSharedWithMe || file.sharedBy
                              ? "Remove from Shared With Me"
                              : file.isSentShare
                              ? "Revoke share"
                              : "Delete file permanently"
                          }
                        >
                          <span>{actionLoadingId === file._id ? "⏳" : "🗑️"}</span>
                          <span>
                            {file.isSharedWithMe || file.sharedBy
                              ? "Remove"
                              : file.isSentShare
                              ? "Revoke"
                              : "Delete"}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ================= COLLABORATIVE SHARE MODAL ================= */}
      {shareItem && (
        <ShareModal
          item={shareItem}
          itemType={shareItemType}
          currentUser={user}
          onClose={() => setShareItem(null)}
          onShareUpdated={() => fetchData()}
        />
      )}

      {/* ================= NEW FOLDER MODAL ================= */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Create New Folder</h3>
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setFolderName("");
                  setError("");
                }}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createFolder();
              }}
              placeholder="e.g. Invoices, Project Files, Personal"
              autoFocus
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
            />

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setFolderName("");
                  setError("");
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={createFolder}
                disabled={creatingFolder}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingFolder ? "Creating..." : "Create Folder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= UPLOAD VIA URL MODAL ================= */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌐</span>
                <h3 className="text-lg font-bold text-slate-900">Upload File from URL</h3>
              </div>
              <button
                onClick={() => {
                  setShowUrlModal(false);
                  setUrlInput("");
                  setError("");
                }}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Enter any direct image or file link on the web. SecureStash will fetch and securely store it in your account.
            </p>

            <form onSubmit={uploadFromUrl}>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                File URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/document.pdf"
                autoFocus
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm mb-4"
              />

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Save to Folder
                </label>
                <select
                  value={uploadTargetFolderId}
                  onChange={(e) => setUploadTargetFolderId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm bg-white"
                >
                  <option value="">📂 General / Root Stash</option>
                  {folders.map((f) => (
                    <option key={f._id} value={f._id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUrlModal(false);
                    setUrlInput("");
                    setError("");
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingUrl}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploadingUrl ? (
                    <>
                      <span className="animate-spin">⏳</span> Stashing File...
                    </>
                  ) : (
                    <>
                      <span>⬆</span> Fetch & Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
