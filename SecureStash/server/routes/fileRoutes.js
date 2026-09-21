const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const mongoose = require("mongoose");
const File = require("../models/File");
const Folder = require("../models/Folder");
const Share = require("../models/Share");
const protect = require("../middleware/authMiddleware");
const { encryptFileInPlace, decryptFileToBuffer } = require("../utils/encryption");

const router = express.Router();

// ===============================
// UPLOADS DIRECTORY
// ===============================
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ===============================
// MULTER STORAGE
// ===============================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },

    filename: function (req, file, cb) {
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB limit
    },

    fileFilter: function (req, file, cb) {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/svg+xml",
            "application/pdf",
            "text/plain",
            "text/csv",
            "text/markdown",
            "application/json",
            "application/zip",
            "application/x-zip-compressed",
            "application/x-rar-compressed",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/javascript",
            "text/javascript",
            "audio/mpeg",
            "audio/wav",
            "video/mp4",
            "video/webm",
            "application/octet-stream"
        ];

        if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith("image/") || file.mimetype.startsWith("text/")) {
            cb(null, true);
        } else {
            cb(new Error("File type not supported: " + file.mimetype));
        }
    }
});

// ===============================
// UPLOAD FILE (MULTIPART FORM)
// ===============================
router.post("/upload", protect, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Please select a file to upload"
            });
        }

        const { folder } = req.body;
        let targetFolder = null;

        if (folder && folder !== "null" && folder !== "undefined") {
            const validFolder = await Folder.findOne({
                _id: folder,
                owner: req.user
            });

            if (!validFolder) {
                return res.status(403).json({
                    message: "Forbidden: Selected folder not found or does not belong to your account."
                });
            }
            targetFolder = validFolder._id;
        }

        const savedFilePath = path.join(uploadsDir, req.file.filename);
        try {
            encryptFileInPlace(savedFilePath);
        } catch (encErr) {
            console.error("AES-256 In-Place Encryption Error:", encErr);
        }

        const savedFile = await File.create({
            name: req.file.filename,
            originalName: req.file.originalname,
            fileUrl: `/api/files/download/${req.file.filename}`,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            owner: req.user,
            folder: targetFolder
        });

        res.status(201).json({
            message: "File uploaded and encrypted successfully",
            file: savedFile
        });
    } catch (error) {
        console.error("Upload File Error:", error);
        res.status(500).json({
            message: error.message || "Server error"
        });
    }
});

// ===============================
// UPLOAD FILE FROM URL
// ===============================
router.post("/upload-url", protect, async (req, res) => {
    try {
        const { url, folder } = req.body;

        if (!url || typeof url !== "string") {
            return res.status(400).json({
                message: "A valid URL is required"
            });
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                return res.status(400).json({
                    message: "URL must start with http:// or https://"
                });
            }
        } catch (e) {
            return res.status(400).json({
                message: "Invalid URL format"
            });
        }

        // Fetch remote file
        const response = await fetch(url, {
            headers: {
                "User-Agent": "SecureStash/1.0"
            }
        });

        if (!response.ok) {
            return res.status(400).json({
                message: `Failed to download file from URL (status ${response.status})`
            });
        }

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length > 50 * 1024 * 1024) {
            return res.status(400).json({
                message: "File size from URL exceeds 50 MB limit"
            });
        }

        // Extract original file name
        let originalName = path.basename(parsedUrl.pathname) || "downloaded-file";
        if (!path.extname(originalName)) {
            if (contentType.includes("jpeg") || contentType.includes("jpg")) originalName += ".jpg";
            else if (contentType.includes("png")) originalName += ".png";
            else if (contentType.includes("gif")) originalName += ".gif";
            else if (contentType.includes("pdf")) originalName += ".pdf";
            else if (contentType.includes("json")) originalName += ".json";
            else if (contentType.includes("text")) originalName += ".txt";
            else originalName += ".bin";
        }

        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(originalName);
        const destinationPath = path.join(uploadsDir, uniqueName);

        fs.writeFileSync(destinationPath, buffer);
        try {
            encryptFileInPlace(destinationPath);
        } catch (encErr) {
            console.error("AES-256 In-Place Encryption Error (URL upload):", encErr);
        }

        let targetFolder = null;
        if (folder && folder !== "null" && folder !== "undefined") {
            const validFolder = await Folder.findOne({
                _id: folder,
                owner: req.user
            });

            if (!validFolder) {
                return res.status(403).json({
                    message: "Forbidden: Selected folder not found or does not belong to your account."
                });
            }
            targetFolder = validFolder._id;
        }

        const savedFile = await File.create({
            name: uniqueName,
            originalName: originalName,
            fileUrl: `/api/files/download/${uniqueName}`,
            fileType: contentType.split(";")[0],
            fileSize: buffer.length,
            owner: req.user,
            folder: targetFolder
        });

        res.status(201).json({
            message: "File downloaded, encrypted and stashed successfully",
            file: savedFile
        });
    } catch (error) {
        console.error("Upload From URL Error:", error);
        res.status(500).json({
            message: error.message || "Failed to download and stash file from URL"
        });
    }
});

// ===============================
// GET ALL FILES
// ===============================
router.get("/", protect, async (req, res) => {
    try {
        const files = await File.find({
            owner: req.user
        }).sort({
            createdAt: -1
        });

        res.status(200).json({
            message: "Files fetched successfully",
            files
        });
    } catch (error) {
        console.error("Get Files Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// SECURE FILE DOWNLOAD (OWNER OR SHARED COLLABORATOR)
// ===============================
router.get("/download/:id", protect, async (req, res) => {
    try {
        const idOrName = req.params.id;
        const isObjectId = mongoose.Types.ObjectId.isValid(idOrName);
        let file = null;

        if (isObjectId) {
            file = await File.findOne({
                _id: idOrName,
                owner: req.user
            });
        }
        if (!file) {
            file = await File.findOne({
                name: idOrName,
                owner: req.user
            });
        }

        // If not owner, check if the file or its folder was shared with user
        if (!file && isObjectId) {
            const hasFileShare = await Share.findOne({
                file: idOrName,
                sharedWith: req.user
            });

            if (hasFileShare) {
                file = await File.findById(idOrName);
            } else {
                const candidate = await File.findById(idOrName);
                if (candidate && candidate.folder) {
                    const hasFolderShare = await Share.findOne({
                        folder: candidate.folder,
                        sharedWith: req.user
                    });
                    if (hasFolderShare) {
                        file = candidate;
                    }
                }
            }
        }

        if (!file) {
            return res.status(404).json({
                message: "File not found or access denied"
            });
        }

        const filePath = path.join(uploadsDir, file.name);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "File does not exist on storage disk"
            });
        }

        const decryptedBuffer = decryptFileToBuffer(filePath);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
        res.setHeader("Content-Type", file.fileType || "application/octet-stream");
        res.setHeader("Content-Length", decryptedBuffer.length);
        return res.send(decryptedBuffer);
    } catch (error) {
        console.error("Secure Download Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// STREAM / PREVIEW FILE (INLINE)
// ===============================
router.get("/preview/:id", protect, async (req, res) => {
    try {
        const idOrName = req.params.id;
        const isObjectId = mongoose.Types.ObjectId.isValid(idOrName);
        let file = null;

        if (isObjectId) {
            file = await File.findOne({
                _id: idOrName,
                owner: req.user
            });
        }
        if (!file) {
            file = await File.findOne({
                name: idOrName,
                owner: req.user
            });
        }

        if (!file && isObjectId) {
            const hasFileShare = await Share.findOne({
                file: idOrName,
                sharedWith: req.user
            });
            if (hasFileShare) {
                file = await File.findById(idOrName);
            } else {
                const candidate = await File.findById(idOrName);
                if (candidate && candidate.folder) {
                    const hasFolderShare = await Share.findOne({
                        folder: candidate.folder,
                        sharedWith: req.user
                    });
                    if (hasFolderShare) file = candidate;
                }
            }
        }

        if (!file) {
            return res.status(404).json({
                message: "File not found or access denied"
            });
        }

        const filePath = path.join(uploadsDir, file.name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "File missing on disk"
            });
        }

        const decryptedBuffer = decryptFileToBuffer(filePath);
        res.setHeader("Content-Type", file.fileType || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
        res.setHeader("Content-Length", decryptedBuffer.length);
        return res.send(decryptedBuffer);
    } catch (error) {
        console.error("Preview Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// TOGGLE STAR / FAVORITE FILE
// ===============================
router.patch("/:id/star", protect, async (req, res) => {
    try {
        const file = await File.findOne({
            _id: req.params.id,
            owner: req.user
        });

        if (!file) {
            return res.status(404).json({
                message: "File not found or access denied"
            });
        }

        file.isStarred = !file.isStarred;
        await file.save();

        res.status(200).json({
            message: file.isStarred ? "File starred" : "File unstarred",
            isStarred: file.isStarred,
            file
        });
    } catch (error) {
        console.error("Star File Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// DELETE FILE
// ===============================
router.delete("/:id", protect, async (req, res) => {
    try {
        const file = await File.findOne({
            _id: req.params.id,
            owner: req.user
        });

        if (!file) {
            return res.status(404).json({
                message: "File not found or access denied"
            });
        }

        const filePath = path.join(uploadsDir, file.name);

        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                console.warn("Could not delete physical file:", err.message);
            }
        }

        // Delete associated shares
        await Share.deleteMany({ file: file._id });

        // Delete database record
        await File.deleteOne({ _id: file._id });

        res.status(200).json({
            message: "File deleted successfully",
            fileId: file._id
        });
    } catch (error) {
        console.error("Delete File Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// GET FILES BY FOLDER (OWNER OR SHARED)
// ===============================
router.get("/folder/:folderId", protect, async (req, res) => {
    try {
        const folderId = req.params.folderId;
        const isOwner = await Folder.findOne({ _id: folderId, owner: req.user });
        const isShared = !isOwner && (await Share.findOne({ folder: folderId, sharedWith: req.user }));

        if (!isOwner && !isShared) {
            return res.status(403).json({
                message: "Access denied to this folder"
            });
        }

        const files = await File.find({
            folder: folderId
        }).sort({
            createdAt: -1
        });

        res.status(200).json({
            message: "Folder files fetched successfully",
            files
        });
    } catch (error) {
        console.error("Get Folder Files Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// DOWNLOAD SHARED FILE
// ===============================
router.get("/shared-download/:fileId", protect, async (req, res) => {
    try {
        const share = await Share.findOne({
            file: req.params.fileId,
            sharedWith: req.user
        });

        if (!share) {
            return res.status(403).json({
                message: "You do not have access to this file"
            });
        }

        const file = await File.findById(req.params.fileId);

        if (!file) {
            return res.status(404).json({
                message: "File not found"
            });
        }

        const filePath = path.join(uploadsDir, file.name);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "Shared file missing on storage disk"
            });
        }

        const decryptedBuffer = decryptFileToBuffer(filePath);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
        res.setHeader("Content-Type", file.fileType || "application/octet-stream");
        res.setHeader("Content-Length", decryptedBuffer.length);
        return res.send(decryptedBuffer);
    } catch (error) {
        console.error("Shared File Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// UPLOAD ERROR HANDLER
// ===============================
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                message: "File size cannot exceed 50 MB"
            });
        }
        return res.status(400).json({
            message: error.message
        });
    }

    if (error) {
        return res.status(400).json({
            message: error.message
        });
    }

    next();
});

module.exports = router;
