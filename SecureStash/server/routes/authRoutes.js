const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const Share = require("../models/Share");
const { verifyGenuineEmail } = require("../utils/emailVerifier");
const { sendOtpEmail } = require("../utils/mailer");

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

// In-memory store for genuine email registration verification OTPs
// Maps: cleanEmail -> { name, email, hashedPassword, code, expiresAt }
const pendingVerifications = new Map();

// In-memory store for passwordless login OTPs
// Maps: cleanEmail -> { code, expiresAt, userId }
const pendingLoginOtps = new Map();

// ===============================
// VALIDATORS
// ===============================
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
// STEP 1: SEND REGISTRATION OTP (GENUINE EMAIL VERIFICATION)
// ===============================
router.post("/send-register-otp", registerLimiter, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Full name, email, and password are required."
            });
        }

        const trimmedName = name.trim();
        if (trimmedName.length < 2 || trimmedName.length > 50) {
            return res.status(400).json({
                message: "Name must be between 2 and 50 characters."
            });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        // Real DNS MX and disposable email verification
        const emailCheck = await verifyGenuineEmail(email);
        if (!emailCheck.isValid) {
            return res.status(400).json({
                message: emailCheck.message
            });
        }

        const cleanEmail = emailCheck.email;

        // Check if user already registered in MongoDB Atlas
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
            return res.status(400).json({
                message: "An account with this email address already exists. Please login instead."
            });
        }

        // Hash password securely (10 salt rounds)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate 6-digit cryptographic verification code
        const code = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

        pendingVerifications.set(cleanEmail, {
            name: trimmedName,
            email: cleanEmail,
            hashedPassword,
            code,
            expiresAt
        });

        console.log(`📧 Genuine Email Verification OTP for ${cleanEmail}: ${code}`);

        // Send OTP directly to recipient's Gmail inbox
        const emailResult = await sendOtpEmail({
            to: cleanEmail,
            code,
            type: "register",
            name: trimmedName
        });

        res.status(200).json({
            message: emailResult.sent
                ? `A 6-digit verification code has been sent to your Gmail inbox (${cleanEmail}). Please check your Inbox and Spam folder.`
                : `Verification code generated! (Cloud host blocked email delivery — code provided below)`,
            code: emailResult.sent ? undefined : code,
            email: cleanEmail,
            verificationRequired: true,
            emailDelivered: emailResult.sent
        });

    } catch (error) {
        console.error("Send Register OTP Error:", error);
        res.status(500).json({
            message: "Failed to verify email. Please try again."
        });
    }
});

// ===============================
// STEP 2: VERIFY OTP & CREATE ACCOUNT
// ===============================
router.post("/verify-and-register", registerLimiter, async (req, res) => {
    try {
        const email = req.body.email;
        const code = req.body.code || req.body.otp;

        if (!email || !code) {
            return res.status(400).json({
                message: "Email address and 6-digit verification code are required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const pending = pendingVerifications.get(cleanEmail);

        if (!pending) {
            return res.status(400).json({
                message: "No pending verification found for this email, or the code has expired. Please try registering again."
            });
        }

        if (Date.now() > pending.expiresAt) {
            pendingVerifications.delete(cleanEmail);
            return res.status(400).json({
                message: "Verification code has expired. Please request a new code."
            });
        }

        if (pending.code !== String(code).trim()) {
            return res.status(400).json({
                message: "Invalid verification code. Please check your code and try again."
            });
        }

        // Create verified user in MongoDB Atlas
        const user = await User.create({
            name: pending.name,
            email: pending.email,
            password: pending.hashedPassword
        });

        // Clean up pending verification
        pendingVerifications.delete(cleanEmail);

        // Auto-link any pending shares invited to this email
        try {
            await Share.updateMany(
                { invitedEmail: cleanEmail },
                { sharedWith: user._id, invitedEmail: null }
            );
        } catch (e) {
            console.warn("Auto-linking pending shares notice:", e.message);
        }

        const secret = process.env.JWT_SECRET || "SecureStash_Default_Secret_2026";
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            secret,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "Genuine email verified and account created successfully!",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Verify & Register Error:", error);
        res.status(500).json({
            message: error.message || "Failed to create account."
        });
    }
});

// ===============================
// DIRECT REGISTER (REQUIRES VERIFIED OTP TO PREVENT FAKE EMAILS)
// ===============================
router.post("/register", registerLimiter, async (req, res) => {
    try {
        const { name, email, password, code } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Full name, email, and password are required."
            });
        }

        const trimmedName = name.trim();
        if (trimmedName.length < 2 || trimmedName.length > 50) {
            return res.status(400).json({
                message: "Name must be between 2 and 50 characters."
            });
        }

        // Genuine email verification: checks format, disposable blacklist & DNS MX records
        const emailCheck = await verifyGenuineEmail(email);
        if (!emailCheck.isValid) {
            return res.status(400).json({
                message: emailCheck.message
            });
        }

        const cleanEmail = emailCheck.email;

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
            return res.status(400).json({
                message: "An account with this email address already exists. Please login instead."
            });
        }

        // Strict verification: code MUST be provided and match pending verification
        if (!code) {
            return res.status(400).json({
                message: "A verified 6-digit email OTP is required. Please request a verification code via /send-register-otp first."
            });
        }

        const pending = pendingVerifications.get(cleanEmail);
        if (!pending || pending.code !== String(code).trim()) {
            return res.status(400).json({
                message: "Invalid or expired verification code."
            });
        }
        pendingVerifications.delete(cleanEmail);

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: trimmedName,
            email: cleanEmail,
            password: hashedPassword
        });

        // Automatically link pending file or folder shares
        try {
            await Share.updateMany(
                { invitedEmail: cleanEmail },
                { sharedWith: user._id, invitedEmail: null }
            );
        } catch (e) {
            console.warn("Auto-linking pending shares notice:", e.message);
        }

        const secret = process.env.JWT_SECRET || "SecureStash_Default_Secret_2026";
        const token = jwt.sign(
            { userId: user._id, email: user.email },
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
            message: error.message || "Server error during registration."
        });
    }
});

// ===============================
// PASSWORD LOGIN
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

        // Auto-link any pending shares received while user was logged out
        try {
            await Share.updateMany(
                { invitedEmail: cleanEmail },
                { sharedWith: user._id, invitedEmail: null }
            );
        } catch (e) {
            console.warn("Auto-linking shares on login notice:", e.message);
        }

        const secret = process.env.JWT_SECRET || "SecureStash_Default_Secret_2026";
        const token = jwt.sign(
            { userId: user._id, email: user.email },
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
// PASSWORDLESS LOGIN STEP 1: SEND LOGIN OTP
// ===============================
router.post("/send-login-otp", loginLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email address is required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({
                message: "No account found with this email address. Please register first."
            });
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        pendingLoginOtps.set(cleanEmail, {
            code,
            expiresAt,
            userId: user._id
        });

        console.log(`⚡ Passwordless Login OTP for ${cleanEmail}: ${code}`);

        // Send real email via Nodemailer
        const emailResult = await sendOtpEmail({
            to: cleanEmail,
            code,
            type: "login",
            name: user.name
        });

        res.status(200).json({
            message: emailResult.sent
                ? `A 6-digit login code has been sent to your Gmail inbox (${cleanEmail}). Please check your Inbox and Spam folder.`
                : `One-time login code generated! (Cloud host blocked email delivery — code provided below)`,
            code: emailResult.sent ? undefined : code,
            email: cleanEmail,
            emailDelivered: emailResult.sent
        });

    } catch (error) {
        console.error("Send Login OTP Error:", error);
        res.status(500).json({
            message: "Failed to send login code. Please try again."
        });
    }
});

// ===============================
// PASSWORDLESS LOGIN STEP 2: VERIFY OTP & SIGN IN
// ===============================
router.post("/verify-login-otp", loginLimiter, async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                message: "Email and 6-digit login code are required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const pending = pendingLoginOtps.get(cleanEmail);

        if (!pending) {
            return res.status(400).json({
                message: "No pending login code found for this email, or it has expired. Please request a new code."
            });
        }

        if (Date.now() > pending.expiresAt) {
            pendingLoginOtps.delete(cleanEmail);
            return res.status(400).json({
                message: "Login code has expired. Please request a new code."
            });
        }

        if (pending.code !== String(code).trim()) {
            return res.status(400).json({
                message: "Invalid login code. Please check the code sent to your Gmail inbox."
            });
        }

        const user = await User.findById(pending.userId);
        if (!user) {
            return res.status(404).json({
                message: "User account not found."
            });
        }

        // Clean up pending OTP
        pendingLoginOtps.delete(cleanEmail);

        // Auto-link any pending shares invited to this email
        try {
            await Share.updateMany(
                { invitedEmail: cleanEmail },
                { sharedWith: user._id, invitedEmail: null }
            );
        } catch (e) {
            console.warn("Auto-linking pending shares notice:", e.message);
        }

        const secret = process.env.JWT_SECRET || "SecureStash_Default_Secret_2026";
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            secret,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Signed in successfully via email OTP!",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Verify Login OTP Error:", error);
        res.status(500).json({
            message: "Failed to authenticate login code."
        });
    }
});

// ===============================
// FORGOT PASSWORD
// ===============================
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Please enter your registered email address."
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.status(404).json({
                message: `No account found for "${cleanEmail}". Please register this email address first before resetting password.`
            });
        }

        // Generate 6-digit code
        const resetCode = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
        const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        user.resetPasswordCode = resetCode;
        user.resetPasswordExpires = resetExpires;
        await user.save();

        console.log(`🔑 Password Recovery Code for ${cleanEmail}: ${resetCode}`);

        // Send recovery email via Nodemailer
        const emailResult = await sendOtpEmail({
            to: cleanEmail,
            code: resetCode,
            type: "reset",
            name: user.name
        });

        res.status(200).json({
            message: emailResult.sent
                ? "A 6-digit password recovery code has been sent to your Gmail inbox. It expires in 15 minutes."
                : "A 6-digit recovery code has been generated! (Cloud host blocked email delivery — code provided below)",
            code: emailResult.sent ? undefined : resetCode,
            emailDelivered: emailResult.sent
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({
            message: "Server error generating recovery code."
        });
    }
});

// ===============================
// RESET PASSWORD
// ===============================
router.post("/reset-password", forgotPasswordLimiter, async (req, res) => {
    try {
        const email = req.body.email;
        const code = req.body.code || req.body.resetCode || req.body.otp;
        const newPassword = req.body.newPassword || req.body.password;

        if (!email || !code || !newPassword) {
            return res.status(400).json({
                message: "Email, verification code, and new password are required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                message: "New password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        const user = await User.findOne({
            email: cleanEmail,
            resetPasswordCode: String(code).trim(),
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired verification code. Please request a new one."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetPasswordCode = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.status(200).json({
            message: "Password reset successful! You can now log in with your new password."
        });

    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({
            message: "Server error resetting password."
        });
    }
});

module.exports = router;
