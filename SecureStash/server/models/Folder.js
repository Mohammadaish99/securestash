const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        parentFolder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            default: null
        }
    },
    {
        timestamps: true
    }
);

folderSchema.index({ owner: 1, parentFolder: 1 });

module.exports = mongoose.model("Folder", folderSchema);