import { useEffect, useState, useRef, useCallback } from "react";
import API, { BACKEND_URL, API_BASE_URL } from "../api/api";

function Dashboard({ onLogout }) {
  const [activeMenu, setActiveMenu] = useState("My Files");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
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

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");

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
      const [folderResponse, fileResponse] = await Promise.all([
        API.get("/folders"),
        API.get("/files")
      ]);
      setFolders(folderResponse.data.folders || []);
      setFiles(fileResponse.data.files || []);

      try {
        const sharedResponse = await API.get("/shares/files");
        setSharedFiles(sharedResponse.data.shares || []);
      } catch (e) {
        console.warn("Shared files fetch warning:", e.message);
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
        const [folderResponse, fileResponse] = await Promise.all([
          API.get("/folders"),
          API.get("/files")
        ]);

        if (!ignore) {
          setFolders(folderResponse.data.folders || []);
          setFiles(fileResponse.data.files || []);
        }

        try {
          const sharedResponse = await API.get("/shares/files");
          if (!ignore) setSharedFiles(sharedResponse.data.shares || []);
        } catch (e) {
          console.warn("Shared files fetch warning:", e.message);
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
  // DELETE FILE
  // ===============================
  const deleteFile = async (file) => {
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
      // Fallback: direct window open with query token
      const fallbackUrl = `${API_BASE_URL}/files/download/${file._id}?token=${token}`;
      window.open(fallbackUrl, "_blank");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ===============================
  // PREVIEW / OPEN FILE
  // ===============================
  const openFile = (file) => {
    if (!file.fileUrl) return;
    const directUrl = `${BACKEND_URL}${file.fileUrl}`;
    window.open(directUrl, "_blank", "noopener,noreferrer");
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

  // Helper for size display
  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
      return sharedFiles
        .map((share) => share.file)
        .filter(Boolean)
        .filter((file) =>
          file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    if (activeMenu === "Recent") {
      list = [...files].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    return list.filter((file) => {
      const matchesSearch = file.originalName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (currentFolder && activeMenu === "My Files") {
        return matchesSearch && file.folder === currentFolder._id;
      }
      return matchesSearch;
    });
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
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/30">
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
              }}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${
                activeMenu === "My Files"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <span>📁</span> My Files
            </button>

            <button
              onClick={() => setActiveMenu("Shared With Me")}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${
                activeMenu === "Shared With Me"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <span>🤝</span> Shared With Me
            </button>

            <button
              onClick={() => setActiveMenu("Recent")}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${
                activeMenu === "Recent"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <span>🕘</span> Recent
            </button>

            <button
              onClick={() => setActiveMenu("Starred")}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${
                activeMenu === "Starred"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <span>⭐</span> Starred
            </button>
          </nav>
        </div>

        {/* Dynamic Storage Bar */}
        <div className="p-4">
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Storage</p>
              <span className="text-xs text-blue-400 font-medium">{storagePercentage}%</span>
            </div>

            <p className="text-base font-bold text-white mt-1">
              {usedMB > 1024 ? `${usedGB} GB` : `${usedMB} MB`}{" "}
              <span className="text-slate-500 font-normal">/ 10 GB</span>
            </p>

            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
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
                className="w-full rounded-xl bg-slate-100 pl-11 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition border border-transparent focus:border-blue-300"
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

          {/* User Profile */}
          <div className="flex items-center ml-4">
            <div className="hidden sm:block text-right mr-3">
              <p className="font-semibold text-slate-800 text-sm">{user?.name || "User"}</p>
              <p className="text-xs text-slate-500 truncate max-w-[150px]">{user?.email || ""}</p>
            </div>

            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>

            <button
              onClick={onLogout}
              className="ml-3 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition border border-red-200"
            >
              Logout
            </button>
          </div>
        </header>

        {/* ================= CONTENT ================= */}
        <section className="p-4 md:p-8 flex-1 overflow-y-auto">
          {/* Breadcrumb / Navigation */}
          {currentFolder && (
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <button
                onClick={() => setCurrentFolder(null)}
                className="hover:text-blue-600 font-medium"
              >
                My Files
              </button>
              <span>/</span>
              <span className="font-semibold text-slate-800">{currentFolder.name}</span>
            </div>
          )}

          {/* Heading & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                {currentFolder ? currentFolder.name : activeMenu}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Manage your files and folders securely in cloud stash.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => fetchData()}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 transition text-sm flex items-center gap-1.5 shadow-sm"
                title="Refresh data"
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
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition text-sm flex items-center gap-2 shadow-md shadow-blue-500/20"
              >
                <span>⬆</span> Upload File
              </button>
            </div>
          </div>

          {/* ================= SUCCESS BANNER ================= */}
          {success && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800 flex items-center justify-between text-sm shadow-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>{success}</span>
              </div>
              <button onClick={() => setSuccess("")} className="text-green-600 hover:text-green-800 font-bold">
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
            <div className="mt-6 bg-white rounded-2xl border-2 border-blue-500 p-5 shadow-lg shadow-blue-500/10">
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
                      setError("");
                    }}
                    disabled={uploadingFile}
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

          {/* ================= QUICK STATS ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Files</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {loading ? "..." : files.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">{formatFileSize(usedBytes)} total space</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Folders</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {loading ? "..." : folders.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Organized workspaces</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shared Files</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {loading ? "..." : sharedFiles.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Files shared with you</p>
            </div>
          </div>

          {/* ================= FOLDERS ================= */}
          {activeMenu === "My Files" && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Folders</h3>

              {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
                  Loading folders...
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-slate-400 text-sm">
                    {searchQuery ? "No matching folders found." : "No folders created yet."}
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
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => deleteFolder(folder, e)}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition text-xs opacity-0 group-hover:opacity-100"
                              title="Delete folder"
                            >
                              🗑️
                            </button>
                            <span className="text-xs text-slate-400 group-hover:text-blue-600">Open &rarr;</span>
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

          {/* ================= FILES ================= */}
          <div className="mt-8 mb-12">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {currentFolder ? `Files in "${currentFolder.name}"` : "Files"}
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
                    : "Upload your first file or stash one from a URL."}
                </p>
                <div className="flex justify-center gap-3 mt-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
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
              </div>
            ) : (
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
                          {file.fileType?.startsWith("image/")
                            ? "🖼️"
                            : file.fileType?.includes("pdf")
                            ? "📕"
                            : file.fileType?.includes("zip") || file.fileType?.includes("tar")
                            ? "🗜️"
                            : file.fileType?.includes("audio")
                            ? "🎵"
                            : file.fileType?.includes("video")
                            ? "🎥"
                            : "📄"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className="font-semibold text-slate-800 text-sm truncate hover:text-blue-600 cursor-pointer"
                            onClick={() => openFile(file)}
                            title={file.originalName}
                          >
                            {file.originalName}
                          </p>
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

                      {/* Action Buttons: Preview, Download, Delete */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => openFile(file)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-1"
                          title="Open / Preview in new tab"
                        >
                          <span>👁️</span> Open
                        </button>

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

                        <button
                          onClick={() => deleteFile(file)}
                          disabled={actionLoadingId === file._id}
                          className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 transition flex items-center gap-1 disabled:opacity-50"
                          title="Delete file permanently"
                        >
                          <span>🗑️</span> Delete
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
              placeholder="e.g. Work Documents, Photos"
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