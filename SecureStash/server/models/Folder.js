const mongoose = require("mongoose");
const { LocalFolder } = require("../config/localStore");

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

const MongooseFolder = mongoose.model("Folder", folderSchema);

const FolderProxy = new Proxy(MongooseFolder, {
    get(target, prop, receiver) {
        if (mongoose.connection.readyState === 1) {
            return Reflect.get(target, prop, receiver);
        }
        if (typeof LocalFolder[prop] === "function") {
            return LocalFolder[prop].bind(LocalFolder);
        }
        return Reflect.get(target, prop, receiver);
    }
});

module.exports = FolderProxy;