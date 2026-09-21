const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        originalName: {
            type: String,
            required: true
        },

        fileUrl: {
            type: String,
            required: true
        },

        fileType: {
            type: String,
            required: true
        },

        fileSize: {
            type: Number,
            required: true
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        folder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            default: null
        },

        isStarred: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Indexes for fast querying
fileSchema.index({ owner: 1, folder: 1 });
fileSchema.index({ owner: 1, isStarred: 1 });
fileSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("File", fileSchema);