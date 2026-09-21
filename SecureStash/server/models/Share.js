const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema(
    {
        file: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "File",
            default: null
        },

        folder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            default: null
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        sharedWith: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        invitedEmail: {
            type: String,
            lowercase: true,
            trim: true,
            default: null
        },

        permission: {
            type: String,
            enum: ["view", "download"],
            default: "download"
        }
    },
    {
        timestamps: true
    }
);

// Compound indexes to prevent duplicate shares and speed up collaborator queries
shareSchema.index({ file: 1, sharedWith: 1 });
shareSchema.index({ folder: 1, sharedWith: 1 });
shareSchema.index({ sharedWith: 1 });
shareSchema.index({ invitedEmail: 1 });
shareSchema.index({ owner: 1 });

module.exports = mongoose.model("Share", shareSchema);