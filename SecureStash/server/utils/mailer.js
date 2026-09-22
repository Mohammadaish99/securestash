const nodemailer = require("nodemailer");

let cachedTransporter = null;

/**
 * Creates and returns a cached Nodemailer transporter with connection pooling.
 * Supports Gmail SMTP with IPv4 optimization to eliminate buffering and delays.
 */
function getTransporter() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        return null;
    }

    if (!cachedTransporter) {
        cachedTransporter = nodemailer.createTransport({
            service: "gmail",
            pool: true,
            maxConnections: 3,
            maxMessages: 100,
            rateDelta: 1000,
            rateLimit: 5,
            family: 4, // Force IPv4 to eliminate IPv6 DNS lookup delays
            auth: {
                user: user.trim(),
                pass: pass.trim().replace(/\s+/g, "") // Remove spaces from 16-character app password if any
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 12000
        });
    }

    return cachedTransporter;
}

/**
 * Sends a stylized, responsive OTP verification email.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.code - 6-digit verification code
 * @param {string} options.type - 'register' | 'login' | 'reset'
 * @param {string} [options.name] - Recipient name
 */
async function sendOtpEmail({ to, code, type, name = "SecureStash User" }) {
    const transporter = getTransporter();

    let subject = `SecureStash: Your verification code is ${code}`;
    let title = "Verification Code";
    let description = "Please use the one-time code below to complete your verification:";
    let badgeText = "SECURITY VERIFICATION";
    let badgeColor = "#3b82f6";

    if (type === "register") {
        subject = `SecureStash: Your account activation code is ${code}`;
        title = "Welcome to SecureStash";
        description = "Thank you for registering. Use the 6-digit code below to verify your genuine email address and activate your personal vault:";
        badgeText = "NEW ACCOUNT ACTIVATION";
        badgeColor = "#10b981";
    } else if (type === "login") {
        subject = `SecureStash: Your login verification code is ${code}`;
        title = "Passwordless Sign-In";
        description = "You requested to log into your SecureStash vault without a password. Use this one-time code to authenticate:";
        badgeText = "ONE-TIME LOGIN (OTP)";
        badgeColor = "#6366f1";
    } else if (type === "reset") {
        subject = `SecureStash: Your password reset code is ${code}`;
        title = "Password Recovery";
        description = "We received a request to reset the password for your SecureStash account. Use the code below to set a new password:";
        badgeText = "PASSWORD RECOVERY";
        badgeColor = "#f59e0b";
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 0; color: #f8fafc; }
    .container { max-width: 540px; margin: 30px auto; background: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #1e3a8a, #312e81); padding: 32px 24px; text-align: center; }
    .logo { font-size: 32px; line-height: 1; }
    .brand { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin-top: 8px; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: ${badgeColor}; background: rgba(255,255,255,0.08); padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; }
    .title { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0; }
    .desc { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0; }
    .code-card { background: #0f172a; border: 2px dashed #3b82f6; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .code-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
    .code-number { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; margin: 0; }
    .expiry { font-size: 12px; color: #94a3b8; margin-top: 8px; }
    .warning { font-size: 12px; line-height: 1.5; color: #cbd5e1; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; padding: 12px; border-radius: 0 8px 8px 0; margin-bottom: 24px; }
    .footer { background: #0b1120; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔐</div>
      <div class="brand">SecureStash</div>
    </div>
    <div class="content">
      <div class="badge">${badgeText}</div>
      <h2 class="title">${title}</h2>
      <p class="desc">Hello ${name},<br>${description}</p>
      
      <div class="code-card">
        <div class="code-label">Your 6-Digit One-Time Code</div>
        <div class="code-number">${code}</div>
        <div class="expiry">⏱️ Valid for 10 minutes only</div>
      </div>

      <div class="warning">
        🔒 <strong>Security Tip:</strong> Never share this code with anyone. SecureStash staff will never ask for your verification code. If you did not request this, you can safely ignore this email.
      </div>
    </div>
    <div class="footer">
      This is an automated security message from SecureStash Cloud Storage.<br>
      © 2026 SecureStash. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
    if (!transporter) {
        console.warn("\n==================================================");
        console.warn("⚠️  GMAIL SMTP NOT CONFIGURED IN server/.env");
        console.warn("👉 To send real emails to Gmail inboxes, add to server/.env:");
        console.warn("   EMAIL_USER=your_email@gmail.com");
        console.warn("   EMAIL_PASS=your_16_digit_app_password");
        console.warn(`📧 [DEV FALLBACK] Code for ${to}: ${code} (${type})`);
        console.warn("==================================================\n");
        return {
            sent: false,
            code,
            reason: "GMAIL_NOT_CONFIGURED",
            message: "Email credentials not configured in server/.env. Check console or on-screen code."
        };
    }

    try {
        const sendPromise = transporter.sendMail({
            from: `"SecureStash Vault" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text: `Hello ${name},\n\nYour SecureStash verification code is: ${code}\n\nThis code will expire in 10 minutes.\nNever share this code with anyone.`,
            html,
            headers: {
                "X-Priority": "1 (Highest)",
                "X-MSMail-Priority": "High",
                "Importance": "High"
            }
        });

        // 12-second timeout safety guard so HTTP routes NEVER hang indefinitely
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("SMTP_CONNECTION_TIMEOUT")), 12000)
        );

        const info = await Promise.race([sendPromise, timeoutPromise]);

        console.log(`✅ [GMAIL SENT] OTP email dispatched to ${to} (MessageID: ${info.messageId})`);
        return {
            sent: true,
            messageId: info.messageId
        };
    } catch (error) {
        // Reset cached transporter in case the socket died
        cachedTransporter = null;
        console.error(`❌ [GMAIL ERROR / CLOUD BLOCKED] Failed to send email to ${to}:`, error.message);
        console.warn(`📧 [FALLBACK CODE] OTP for ${to}: ${code}`);
        return {
            sent: false,
            code,
            reason: "SMTP_ERROR",
            error: error.message
        };
    }
}

module.exports = {
    sendOtpEmail
};
