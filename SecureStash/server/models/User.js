const mongoose = require("mongoose");
const { LocalUser } = require("../config/localStore");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        resetPasswordCode: {
            type: String,
            default: null
        },

        resetPasswordExpires: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const MongooseUser = mongoose.model("User", userSchema);

const UserProxy = new Proxy(MongooseUser, {
    get(target, prop, receiver) {
        if (mongoose.connection.readyState === 1) {
            return Reflect.get(target, prop, receiver);
        }
        if (typeof LocalUser[prop] === "function") {
            return LocalUser[prop].bind(LocalUser);
        }
        return Reflect.get(target, prop, receiver);
    }
});

module.exports = UserProxy;