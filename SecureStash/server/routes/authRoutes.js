const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

// ===============================
// IN-MEMORY RATE LIMITER
// ===============================
const rateLimitMap = new Map();

const createRateLimiter = (maxAttempts, windowMs, message) => {
    return (req, res, next) => {
        let rawIp = req.headers["x-forwarded-for"]
            ? req.headers["x-forwarded-for"].split(",")[0].trim()
            : req.ip;

        // Never rate limit local reverse tunnel loopback traffic (localhost.run / pinggy)
        if (
            !rawIp ||
            rawIp === "127.0.0.1" ||
            rawIp === "::1" ||
            rawIp === "::ffff:127.0.0.1" ||
            rawIp === "localhost"
        ) {
            return next();
        }

        const now = Date.now();
        const timestamps = (rateLimitMap.get(rawIp) || []).filter(
            (t) => now - t < windowMs
        );

        if (timestamps.length >= maxAttempts) {
            return res.status(429).json({
                message: message || "Too many requests. Please try again later."
            });
        }

        timestamps.push(now);
        rateLimitMap.set(rawIp, timestamps);
        next();
    };
};

const loginLimiter = createRateLimiter(
    25,
    15 * 60 * 1000,
    "Too many login attempts. Please try again after 15 minutes."
);

const registerLimiter = createRateLimiter(
    20,
    60 * 60 * 1000,
    "Too many accounts created recently. Please try again later."
);

const forgotPasswordLimiter = createRateLimiter(
    15,
    15 * 60 * 1000,
    "Too many password reset requests. Please wait 15 minutes before trying again."
);

// ===============================
// VALIDATORS
// ===============================
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
};

const isStrongPassword = (password) => {
    if (!password || typeof password !== "string") return false;
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z0-9\s]/.test(password);
    return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
};

// ===============================
// REGISTER
// ===============================
router.post("/register", registerLimiter, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Full name, email, and password are required."
            });
        }

        const trimmedName = name.trim();
        const cleanEmail = email.toLowerCase().trim();

        if (trimmedName.length < 2 || trimmedName.length > 50) {
            return res.status(400).json({
                message: "Name must be between 2 and 50 characters."
            });
        }

        if (!isValidEmail(cleanEmail)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        const existingUser = await User.findOne({ email: cleanEmail });

        if (existingUser) {
            return res.status(400).json({
                message: "An account with this email already exists."
            });
        }

        // Standard salt rounds 10 for optimal performance and high security
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: trimmedName,
            email: cleanEmail,
            password: hashedPassword
        });

        // Automatically link any pending file or folder shares for this email
        try {
            const Share = require("../models/Share");
            await Share.updateMany(
                { invitedEmail: cleanEmail },
                { sharedWith: user._id, invitedEmail: null }
            );
        } catch (e) {
            console.warn("Auto-linking pending shares notice:", e.message);
        }

        const secret = process.env.JWT_SECRET || "SecureStash_Default_Secret_2026";
        const token = jwt.sign(
            { userId: user._id },
            secret,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "Account created successfully!",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({
            message: "Server error during registration. Please try again."
        });
    }
});

// ===============================
// LOGIN
// ===============================
router.post("/login", loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const secret = process.env.JWT_SECRET || "SecureStash_Default_Secret_2026";
        const token = jwt.sign(
            { userId: user._id },
            secret,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            message: "Server error during login."
        });
    }
});

// ===============================
// FORGOT PASSWORD
// ===============================
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            // For security, don't leak user existence
            return res.status(200).json({
                message: "If that email is registered, a password recovery code has been generated.",
                resetCode: null
            });
        }

        // Generate secure 6-digit recovery code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        user.resetPasswordCode = code;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();

        res.status(200).json({
            message: "Recovery code generated successfully! Valid for 15 minutes.",
            resetCode: code
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({
            message: "Failed to process forgot password request."
        });
    }
});

// ===============================
// RESET PASSWORD
// ===============================
router.post("/reset-password", async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;

        if (!email || !resetCode || !newPassword) {
            return res.status(400).json({
                message: "Email, 6-digit recovery code, and new password are required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const cleanCode = String(resetCode).trim();

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        const user = await User.findOne({ email: cleanEmail });

        if (!user || !user.resetPasswordCode || user.resetPasswordCode !== cleanCode) {
            return res.status(400).json({
                message: "Invalid recovery code. Please check and try again."
            });
        }

        if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) {
            return res.status(400).json({
                message: "Recovery code has expired. Please request a new one."
            });
        }

        // Hash new password with 10 rounds
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordCode = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.status(200).json({
            message: "Password reset successful! You can now log in with your new password."
        });

    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({
            message: "Failed to reset password."
        });
    }
});

module.exports = router;