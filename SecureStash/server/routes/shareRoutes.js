const express = require("express");
const path = require("path");
const fs = require("fs");

const Share = require("../models/Share");
const File = require("../models/File");
const Folder = require("../models/Folder");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const { decryptFileToBuffer } = require("../utils/encryption");

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
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "File content not found on server disk."
            });
        }

        const decryptedBuffer = decryptFileToBuffer(filePath);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
        res.setHeader("Content-Type", file.fileType || "application/octet-stream");
        res.setHeader("Content-Length", decryptedBuffer.length);
        return res.send(decryptedBuffer);
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
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "File content not found on server disk."
            });
        }

        const decryptedBuffer = decryptFileToBuffer(filePath);
        res.setHeader("Content-Type", file.fileType || "application/octet-stream");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(file.originalName)}"`
        );
        res.setHeader("Content-Length", decryptedBuffer.length);
        return res.send(decryptedBuffer);
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

        // Check if receiver is registered in Atlas
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
                : `Invitation recorded for ${cleanEmail}! When they register, this file will appear in their stash.`,
            share
        });
    } catch (error) {
        console.error("Share File Error:", error);
        res.status(500).json({
            message: error.message || "Server error sharing file."
        });
    }
});

// ===============================
// GET SHARED FILES (FILES SHARED WITH ME)
// ===============================
router.get("/files", protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user);
        if (currentUser && currentUser.email) {
            // Auto-link any shares pending for this user's email
            await Share.updateMany(
                { invitedEmail: currentUser.email.toLowerCase() },
                { sharedWith: req.user, invitedEmail: null }
            );
        }

        // Fetch shares where sharedWith is req.user
        const shares = await Share.find({
            sharedWith: req.user,
            file: { $ne: null }
        })
            .populate("file")
            .populate("owner", "name email");

        // Filter out shares where the file may have been deleted
        const validShares = shares.filter((s) => s.file !== null);

        res.status(200).json({
            message: "Shared files fetched successfully",
            shares: validShares
        });
    } catch (error) {
        console.error("Get Shared Files Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// GET SENT SHARES (FILES & FOLDERS SHARED BY ME)
// ===============================
router.get("/sent", protect, async (req, res) => {
    try {
        const shares = await Share.find({
            owner: req.user
        })
            .populate("file")
            .populate("folder")
            .populate("sharedWith", "name email")
            .sort({ createdAt: -1 });

        const validShares = shares.filter((s) => s.file !== null || s.folder !== null);

        res.status(200).json({
            message: "Sent shares fetched successfully",
            shares: validShares
        });
    } catch (error) {
        console.error("Get Sent Shares Error:", error);
        res.status(500).json({
            message: "Server error fetching sent shares."
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
                : `Invitation recorded for ${cleanEmail}! When they register, this folder will appear in their stash.`,
            share
        });
    } catch (error) {
        console.error("Share Folder Error:", error);
        res.status(500).json({
            message: error.message || "Server error sharing folder."
        });
    }
});

// ===============================
// GET SHARED FOLDERS (WORKSPACES SHARED WITH ME)
// ===============================
router.get("/folders", protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user);
        if (currentUser && currentUser.email) {
            await Share.updateMany(
                { invitedEmail: currentUser.email.toLowerCase() },
                { sharedWith: req.user, invitedEmail: null }
            );
        }

        const shares = await Share.find({
            sharedWith: req.user,
            folder: { $ne: null }
        })
            .populate("folder")
            .populate("owner", "name email");

        const validShares = shares.filter((s) => s.folder !== null);

        res.status(200).json({
            message: "Shared folders fetched successfully",
            shares: validShares
        });
    } catch (error) {
        console.error("Get Shared Folders Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ===============================
// GET FILES INSIDE A SHARED FOLDER
// ===============================
router.get("/folder/:folderId/files", protect, async (req, res) => {
    try {
        const { folderId } = req.params;

        // Check if user is folder owner OR has share access
        const isOwner = await Folder.findOne({ _id: folderId, owner: req.user });
        const hasShare = await Share.findOne({
            folder: folderId,
            sharedWith: req.user
        });

        if (!isOwner && !hasShare) {
            return res.status(403).json({
                message: "Access denied: You do not have permission to view this shared workspace."
            });
        }

        const files = await File.find({ folder: folderId }).sort({ createdAt: -1 });

        res.status(200).json({
            message: "Shared folder files fetched successfully",
            files,
            permission: hasShare ? hasShare.permission : "download"
        });
    } catch (error) {
        console.error("Get Shared Folder Files Error:", error);
        res.status(500).json({
            message: "Server error fetching files."
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
// DELETE / REMOVE / REVOKE SHARE
// Works for both:
// 1. Sender (Owner revoking share access from collaborator)
// 2. Recipient (SharedWith user removing the shared item from their stash)
// ===============================
router.delete("/:shareId", protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user);
        const userEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : "";

        // Find share where requesting user is owner OR recipient
        const share = await Share.findOne({
            _id: req.params.shareId,
            $or: [
                { owner: req.user },
                { sharedWith: req.user },
                ...(userEmail ? [{ invitedEmail: userEmail }] : [])
            ]
        });

        if (!share) {
            return res.status(404).json({
                message: "Share record not found or access denied."
            });
        }

        const isOwner = String(share.owner) === String(req.user);
        await Share.deleteOne({ _id: share._id });

        res.status(200).json({
            message: isOwner
                ? "Share access revoked successfully."
                : "Shared item removed from your stash successfully.",
            shareId: req.params.shareId,
            isOwner
        });
    } catch (error) {
        console.error("Delete Share Error:", error);
        res.status(500).json({
            message: "Server error deleting share record."
        });
    }
});

// ===============================
// RECIPIENT REMOVE RECEIVED FILE
// ===============================
router.delete("/received/file/:fileId", protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user);
        const userEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : "";

        const share = await Share.findOne({
            file: req.params.fileId,
            $or: [
                { sharedWith: req.user },
                ...(userEmail ? [{ invitedEmail: userEmail }] : [])
            ]
        });

        if (!share) {
            return res.status(404).json({
                message: "Shared file not found in your received list."
            });
        }

        await Share.deleteOne({ _id: share._id });

        res.status(200).json({
            message: "Shared file removed from your stash.",
            shareId: share._id,
            fileId: req.params.fileId
        });
    } catch (error) {
        console.error("Remove Received File Error:", error);
        res.status(500).json({
            message: "Server error removing shared file."
        });
    }
});

// ===============================
// RECIPIENT REMOVE RECEIVED FOLDER
// ===============================
router.delete("/received/folder/:folderId", protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user);
        const userEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : "";

        const share = await Share.findOne({
            folder: req.params.folderId,
            $or: [
                { sharedWith: req.user },
                ...(userEmail ? [{ invitedEmail: userEmail }] : [])
            ]
        });

        if (!share) {
            return res.status(404).json({
                message: "Shared folder not found in your received list."
            });
        }

        await Share.deleteOne({ _id: share._id });

        res.status(200).json({
            message: "Shared folder removed from your stash.",
            shareId: share._id,
            folderId: req.params.folderId
        });
    } catch (error) {
        console.error("Remove Received Folder Error:", error);
        res.status(500).json({
            message: "Server error removing shared folder."
        });
    }
});

module.exports = router;