const mongoose = require("mongoose");
const { LocalFile } = require("../config/localStore");

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
        },

        isArchived: {
            type: Boolean,
            default: false
        },

        dataBase64: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Indexes for fast querying
fileSchema.index({ owner: 1, folder: 1 });
fileSchema.index({ owner: 1, isStarred: 1 });
fileSchema.index({ owner: 1, isArchived: 1 });
fileSchema.index({ owner: 1, createdAt: -1 });

const MongooseFile = mongoose.model("File", fileSchema);

const FileProxy = new Proxy(MongooseFile, {
    get(target, prop, receiver) {
        if (mongoose.connection.readyState === 1) {
            return Reflect.get(target, prop, receiver);
        }
        if (typeof LocalFile[prop] === "function") {
            return LocalFile[prop].bind(LocalFile);
        }
        return Reflect.get(target, prop, receiver);
    }
});

module.exports = FileProxy;