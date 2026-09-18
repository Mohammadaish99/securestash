const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
// Load .env from server directory first, then process.cwd() fallback
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const folderRoutes = require("./routes/folderRoutes");
const fileRoutes = require("./routes/fileRoutes");
const shareRoutes = require("./routes/shareRoutes");

const app = express();

// Trust proxy for tunnels (localhost.run, pinggy, cloudflare) and mobile carriers
app.set("trust proxy", true);

// ===============================
// UPLOADS DIRECTORY INITIALIZATION
// ===============================
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ===============================
// CORS & MIDDLEWARE
// ===============================
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
    : ["*"];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(null, true);
        },
        credentials: true
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to Database
connectDB();

// ===============================
// STATIC FILES & UPLOADS
// ===============================
app.use("/uploads", express.static(uploadsDir));

// ===============================
// API ROUTES
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/shares", shareRoutes);

// Health check route
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "SecureStash Backend is Running Healthy!",
        timestamp: new Date().toISOString()
    });
});

// ===============================
// CLIENT SERVING (FOR UNIFIED HOSTING)
// ===============================
const clientDistPath = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
        res.sendFile(path.join(clientDistPath, "index.html"));
    });
} else {
    app.get("/", (req, res) => {
        res.json({
            message: "SecureStash Backend is Running!"
        });
    });
}

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error"
    });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`SecureStash server running on port ${PORT}`);
});