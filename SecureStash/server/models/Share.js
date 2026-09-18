const mongoose = require("mongoose");
const { LocalShare } = require("../config/localStore");

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
            required: true
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
shareSchema.index({ owner: 1 });

const MongooseShare = mongoose.model("Share", shareSchema);

const ShareProxy = new Proxy(MongooseShare, {
    get(target, prop, receiver) {
        if (mongoose.connection.readyState === 1) {
            return Reflect.get(target, prop, receiver);
        }
        if (typeof LocalShare[prop] === "function") {
            return LocalShare[prop].bind(LocalShare);
        }
        return Reflect.get(target, prop, receiver);
    }
});

module.exports = ShareProxy;