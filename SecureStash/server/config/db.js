const mongoose = require("mongoose");

const connectDB = async () => {
    console.log("Connecting to MongoDB...");

    if (!process.env.MONGODB_URI) {
        console.error("MongoDB Connection Failed: MONGODB_URI is not set in environment variables.");
        return;
    }

    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB Connected Successfully");
        console.log("Database:", connection.connection.name);
    } catch (error) {
        console.error("MongoDB Connection Failed");
        console.error("Error:", error.message);
    }
};

module.exports = connectDB;