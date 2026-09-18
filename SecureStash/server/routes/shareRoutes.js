const express = require("express");

const Share = require("../models/Share");
const File = require("../models/File");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

const router = express.Router();


// ===============================
// SHARE FILE
// ===============================

router.post("/file/:fileId", protect, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        // Find file owned by logged-in user
        const file = await File.findOne({
            _id: req.params.fileId,
            owner: req.user
        });

        if (!file) {
            return res.status(404).json({
                message: "File not found or access denied"
            });
        }

        // Find receiver
        const receiver = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!receiver) {
            return res.status(404).json({
                message: "User with this email does not exist"
            });
        }

        // Prevent sharing with yourself
        if (receiver._id.toString() === req.user.toString()) {
            return res.status(400).json({
                message: "You cannot share a file with yourself"
            });
        }

        // Check existing share
        const existingShare = await Share.findOne({
            file: file._id,
            sharedWith: receiver._id
        });

        if (existingShare) {
            return res.status(400).json({
                message: "File already shared with this user"
            });
        }

        // Create share
        const share = await Share.create({
            file: file._id,
            owner: req.user,
            sharedWith: receiver._id
        });

        res.status(201).json({
            message: "File shared successfully",
            share
        });

    } catch (error) {
        console.error("Share File Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ===============================
// GET SHARED FILES
// ===============================

router.get("/files", protect, async (req, res) => {
    try {
        const shares = await Share.find({
            sharedWith: req.user
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
                message: "Email is required"
            });
        }

        // Find folder owned by logged-in user
        const folder = await require("../models/Folder").findOne({
            _id: req.params.folderId,
            owner: req.user
        });

        if (!folder) {
            return res.status(404).json({
                message: "Folder not found or access denied"
            });
        }

        // Find receiver
        const receiver = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!receiver) {
            return res.status(404).json({
                message: "User with this email does not exist"
            });
        }

        // Prevent sharing with yourself
        if (receiver._id.toString() === req.user.toString()) {
            return res.status(400).json({
                message: "You cannot share a folder with yourself"
            });
        }

        // Check existing share
        const existingShare = await Share.findOne({
            folder: folder._id,
            sharedWith: receiver._id
        });

        if (existingShare) {
            return res.status(400).json({
                message: "Folder already shared with this user"
            });
        }

        // Create folder share
        const share = await Share.create({
            folder: folder._id,
            owner: req.user,
            sharedWith: receiver._id
        });

        res.status(201).json({
            message: "Folder shared successfully",
            share
        });

    } catch (error) {
        console.error("Share Folder Error:", error);

        res.status(500).json({
            message: "Server error"
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
module.exports = router;