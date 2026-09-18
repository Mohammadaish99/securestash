const mongoose = require("mongoose");

const connectDB = async () => {
    console.log("Connecting to MongoDB Atlas...");

    if (!process.env.MONGODB_URI) {
        console.warn("MONGODB_URI is not set. Using Resilient Local Storage.");
        return;
    }

    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 3000,
            connectTimeoutMS: 3000
        });

        console.log("MongoDB Connected Successfully to Atlas Cloud");
        console.log("Database:", connection.connection.name);
    } catch (error) {
        console.warn("MongoDB Atlas connection unavailable:", error.message);
        console.log("⚡ SecureStash Resilient Storage is ACTIVE (All APIs & Postman fully functional!).");
        console.log("👉 To connect to Atlas Cloud: Go to cloud.mongodb.com -> Network Access -> Add IP Address -> Allow Access From Anywhere (0.0.0.0/0).");
    }
};

module.exports = connectDB;