const express = require("express");
const path = require("path");
const fs = require("fs");

const Share = require("../models/Share");
const File = require("../models/File");
const Folder = require("../models/Folder");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const uploadsDir = path.join(__dirname, "../uploads");

// ===============================
// PUBLIC SHARED FILE METADATA (NO AUTH REQUIRED)
// ===============================
router.get("/public/file/:id", async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({
                message: "Shared file not found or link has expired."
            });
        }

        const owner = await User.findById(file.owner);

        res.status(200).json({
            message: "File found",
            file: {
                _id: file._id,
                name: file.name,
                originalName: file.originalName,
                fileType: file.fileType,
                fileSize: file.fileSize,
                createdAt: file.createdAt,
                owner: {
                    name: owner ? owner.name : "SecureStash User",
                    email: owner ? owner.email : ""
                }
            }
        });
    } catch (error) {
        console.error("Public File Metadata Error:", error);
        res.status(500).json({
            message: "Server error retrieving file."
        });
    }
});

// ===============================
// PUBLIC FILE DOWNLOAD (NO AUTH REQUIRED)
// ===============================
router.get("/public/download/:id", async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({
                message: "Shared file not found."
            });
        }

        const filePath = path.join(uploadsDir, file.name);

        if (!fs.existsSync(filePath) && file.dataBase64) {
            try {
                fs.writeFileSync(filePath, Buffer.from(file.dataBase64, "base64"));
            } catch (e) {
                console.error("Failed to restore shared file from database:", e);
            }
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "File content not found on server disk."
            });
        }

        res.download(filePath, file.originalName, (err) => {
            if (err) console.error("Public Download Stream Error:", err);
        });
    } catch (error) {
        console.error("Public Download Error:", error);
        res.status(500).json({
            message: "Failed to download file."
        });
    }
});

// ===============================
// PUBLIC FILE PREVIEW / STREAM (NO AUTH REQUIRED)
// ===============================
router.get("/public/preview/:id", async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({
                message: "Shared file not found."
            });
        }

        const filePath = path.join(uploadsDir, file.name);

        if (!fs.existsSync(filePath) && file.dataBase64) {
            try {
                fs.writeFileSync(filePath, Buffer.from(file.dataBase64, "base64"));
            } catch (e) {
                console.error("Failed to restore shared preview file from database:", e);
            }
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "File content not found on server disk."
            });
        }

        res.setHeader("Content-Type", file.fileType || "application/octet-stream");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(file.originalName)}"`
        );

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    } catch (error) {
        console.error("Public Preview Error:", error);
        res.status(500).json({
            message: "Failed to stream file preview."
        });
    }
});

// ===============================
// PUBLIC SHARED FOLDER METADATA & FILES (NO AUTH REQUIRED)
// ===============================
router.get("/public/folder/:id", async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);
        if (!folder) {
            return res.status(404).json({
                message: "Shared folder not found or link has expired."
            });
        }

        const owner = await User.findById(folder.owner);
        const files = await File.find({ folder: folder._id }).sort({ createdAt: -1 });

        res.status(200).json({
            message: "Folder found",
            folder: {
                _id: folder._id,
                name: folder.name,
                createdAt: folder.createdAt,
                owner: {
                    name: owner ? owner.name : "SecureStash User",
                    email: owner ? owner.email : ""
                }
            },
            files: files.map((f) => ({
                _id: f._id,
                name: f.name,
                originalName: f.originalName,
                fileType: f.fileType,
                fileSize: f.fileSize,
                createdAt: f.createdAt
            }))
        });
    } catch (error) {
        console.error("Public Folder Metadata Error:", error);
        res.status(500).json({
            message: "Server error retrieving folder."
        });
    }
});

// ===============================
// SHARE FILE (WITH REGISTERED USER OR BY EMAIL)
// ===============================
router.post("/file/:fileId", protect, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Collaborator email is required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();

        // Find file owned by logged-in user
        const file = await File.findOne({
            _id: req.params.fileId,
            owner: req.user
        });

        if (!file) {
            return res.status(404).json({
                message: "File not found or access denied."
            });
        }

        // Check if receiver is registered
        const receiver = await User.findOne({ email: cleanEmail });

        if (receiver && receiver._id.toString() === req.user.toString()) {
            return res.status(400).json({
                message: "You cannot share a file with yourself."
            });
        }

        // Check existing share
        let existingShare = null;
        if (receiver) {
            existingShare = await Share.findOne({
                file: file._id,
                sharedWith: receiver._id
            });
        } else {
            existingShare = await Share.findOne({
                file: file._id,
                invitedEmail: cleanEmail
            });
        }

        if (existingShare) {
            return res.status(400).json({
                message: "File is already shared with this email."
            });
        }

        const permission = req.body.permission === "view" ? "view" : "download";
        const share = await Share.create({
            file: file._id,
            owner: req.user,
            sharedWith: receiver ? receiver._id : null,
            invitedEmail: receiver ? null : cleanEmail,
            permission
        });

        res.status(201).json({
            message: receiver
                ? `File shared with ${receiver.name || receiver.email} successfully!`
                : `Invite recorded for ${cleanEmail}! They can open the share link or register to access it.`,
            share
        });
    } catch (error) {
        console.error("Share File Error:", error);
        res.status(500).json({
            message: "Server error sharing file."
        });
    }
});

// ===============================
// GET SHARED FILES (FILES SHARED WITH ME)
// ===============================
router.get("/files", protect, async (req, res) => {
    try {
        // Fetch shares where sharedWith is req.user
        const shares = await Share.find({
            sharedWith: req.user,
            file: { $ne: null }
        })
            .populate("file")
            .populate("owner", "name email");

        res.status(200).json({
            message: "Shared files fetched successfully",
            shares
        });
    } catch (error) {
        console.error("Get Shared Files Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// SHARE FOLDER
// ===============================
router.post("/folder/:folderId", protect, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Collaborator email is required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();

        const folder = await Folder.findOne({
            _id: req.params.folderId,
            owner: req.user
        });

        if (!folder) {
            return res.status(404).json({
                message: "Folder not found or access denied."
            });
        }

        const receiver = await User.findOne({ email: cleanEmail });

        if (receiver && receiver._id.toString() === req.user.toString()) {
            return res.status(400).json({
                message: "You cannot share a folder with yourself."
            });
        }

        let existingShare = null;
        if (receiver) {
            existingShare = await Share.findOne({
                folder: folder._id,
                sharedWith: receiver._id
            });
        } else {
            existingShare = await Share.findOne({
                folder: folder._id,
                invitedEmail: cleanEmail
            });
        }

        if (existingShare) {
            return res.status(400).json({
                message: "Folder is already shared with this email."
            });
        }

        const permission = req.body.permission === "view" ? "view" : "download";
        const share = await Share.create({
            folder: folder._id,
            owner: req.user,
            sharedWith: receiver ? receiver._id : null,
            invitedEmail: receiver ? null : cleanEmail,
            permission
        });

        res.status(201).json({
            message: receiver
                ? `Folder shared with ${receiver.name || receiver.email} successfully!`
                : `Invite recorded for ${cleanEmail}! They can open the share link or register to access it.`,
            share
        });
    } catch (error) {
        console.error("Share Folder Error:", error);
        res.status(500).json({
            message: "Server error sharing folder."
        });
    }
});

// ===============================
// GET SHARED FOLDERS
// ===============================
router.get("/folders", protect, async (req, res) => {
    try {
        const shares = await Share.find({
            sharedWith: req.user,
            folder: { $ne: null }
        })
            .populate("folder")
            .populate("owner", "name email");

        res.status(200).json({
            message: "Shared folders fetched successfully",
            shares
        });
    } catch (error) {
        console.error("Get Shared Folders Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// GET FILE COLLABORATORS
// ===============================
router.get("/file/:fileId/collaborators", protect, async (req, res) => {
    try {
        const file = await File.findOne({
            _id: req.params.fileId,
            owner: req.user
        });

        if (!file) {
            return res.status(404).json({
                message: "File not found or access denied"
            });
        }

        const collaborators = await Share.find({
            file: file._id
        })
            .populate("sharedWith", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Collaborators fetched",
            collaborators
        });
    } catch (error) {
        console.error("Get File Collaborators Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// GET FOLDER COLLABORATORS
// ===============================
router.get("/folder/:folderId/collaborators", protect, async (req, res) => {
    try {
        const folder = await Folder.findOne({
            _id: req.params.folderId,
            owner: req.user
        });

        if (!folder) {
            return res.status(404).json({
                message: "Folder not found or access denied"
            });
        }

        const collaborators = await Share.find({
            folder: folder._id
        })
            .populate("sharedWith", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Folder collaborators fetched",
            collaborators
        });
    } catch (error) {
        console.error("Get Folder Collaborators Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// REVOKE SHARE ACCESS (DELETE SHARE)
// ===============================
router.delete("/:shareId", protect, async (req, res) => {
    try {
        const share = await Share.findOne({
            _id: req.params.shareId,
            owner: req.user
        });

        if (!share) {
            return res.status(404).json({
                message: "Share record not found or access denied"
            });
        }

        await Share.deleteOne({ _id: share._id });

        res.status(200).json({
            message: "Share access revoked successfully",
            shareId: req.params.shareId
        });
    } catch (error) {
        console.error("Revoke Share Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

module.exports = router;