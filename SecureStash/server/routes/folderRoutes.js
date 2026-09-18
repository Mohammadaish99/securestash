const express = require("express");

const Folder = require("../models/Folder");
const protect = require("../middleware/authMiddleware");

const router = express.Router();


// ===============================
// CREATE FOLDER
// ===============================

router.post("/", protect, async (req, res) => {
    try {
        const { name, parentFolder } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Folder name is required"
            });
        }

        const folder = await Folder.create({
            name,
            owner: req.user,
            parentFolder: parentFolder || null
        });

        res.status(201).json({
            message: "Folder created successfully",
            folder
        });

    } catch (error) {
        console.error("Create Folder Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ===============================
// GET ALL FOLDERS
// ===============================

router.get("/", protect, async (req, res) => {
    try {
        const folders = await Folder.find({
            owner: req.user
        }).sort({
            createdAt: -1
        });

        res.status(200).json({
            message: "Folders fetched successfully",
            folders
        });

    } catch (error) {
        console.error("Get Folders Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ===============================
// UPDATE FOLDER
// ===============================

router.put("/:id", protect, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Folder name is required"
            });
        }

        const folder = await Folder.findOneAndUpdate(
            {
                _id: req.params.id,
                owner: req.user
            },
            {
                name: name
            },
            {
                new: true
            }
        );

        if (!folder) {
            return res.status(404).json({
                message: "Folder not found"
            });
        }

        res.status(200).json({
            message: "Folder updated successfully",
            folder
        });

    } catch (error) {
        console.error("Update Folder Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});
// ===============================
// DELETE FOLDER
// ===============================

router.delete("/:id", protect, async (req, res) => {
    try {
        const folder = await Folder.findOneAndDelete({
            _id: req.params.id,
            owner: req.user
        });

        if (!folder) {
            return res.status(404).json({
                message: "Folder not found or access denied"
            });
        }

        // Clean up: move files to root (folder: null) and delete folder shares
        const File = require("../models/File");
        const Share = require("../models/Share");
        await File.updateMany(
            { folder: folder._id, owner: req.user },
            { folder: null }
        );
        await Share.deleteMany({ folder: folder._id });

        res.status(200).json({
            message: "Folder deleted successfully",
            folderId: folder._id
        });

    } catch (error) {
        console.error("Delete Folder Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});




module.exports = router;