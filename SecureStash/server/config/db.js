const mongoose = require("mongoose");

let isConnecting = false;

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error("FATAL ERROR: MONGODB_URI is not defined in server/.env");
        throw new Error("MONGODB_URI environment variable is required.");
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (isConnecting) return;
    isConnecting = true;

    try {
        console.log("Connecting to MongoDB Atlas...");
        const connection = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000
        });

        console.log("==================================================");
        console.log("✅ MongoDB Atlas Connected Successfully!");
        console.log(`📡 Database Host: ${connection.connection.host}`);
        console.log(`📦 Database Name: ${connection.connection.name}`);
        console.log("==================================================");
        isConnecting = false;
        return connection;
    } catch (error) {
        isConnecting = false;
        console.error("❌ MongoDB Atlas Connection Error:", error.message);
        console.error("\n==================================================");
        console.error("⚠️  MONGODB ATLAS IP ACCESS LIST ACTION NEEDED");
        console.error("👉 Your public IP has changed or is not whitelisted.");
        console.error("👉 To fix in 30 seconds:");
        console.error("   1. Open https://cloud.mongodb.com");
        console.error("   2. Go to 'Network Access' (under Security in sidebar)");
        console.error("   3. Click 'Add IP Address' -> Select 'Allow Access from Anywhere' (0.0.0.0/0)");
        console.error("   4. Click 'Confirm'");
        console.error("==================================================\n");

        // Schedule background retry
        setTimeout(() => {
            if (mongoose.connection.readyState !== 1) {
                connectDB().catch(() => {});
            }
        }, 8000);

        throw error;
    }
};

mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB Atlas connection lost. Attempting background reconnect...");
    setTimeout(() => {
        if (mongoose.connection.readyState !== 1) {
            connectDB().catch(() => {});
        }
    }, 5000);
});

mongoose.connection.on("reconnected", () => {
    console.log("✅ MongoDB Atlas reconnected successfully.");
});

module.exports = connectDB;