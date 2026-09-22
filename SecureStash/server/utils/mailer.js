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
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
      <div style="font-size: 28px; line-height: 1;">🔐</div>
      <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 6px; letter-spacing: -0.5px;">SecureStash</div>
    </div>
    <div style="padding: 28px 24px;">
      <div style="display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: ${badgeColor}; background-color: #f1f5f9; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px;">${badgeText}</div>
      <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">${title}</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">Hello ${name},<br>${description}</p>
      <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px;">Your One-Time Code</div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #2563eb; margin: 0;">${code}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Valid for 10 minutes</div>
      </div>
      <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 0 0 16px 0;">
        Never share this code with anyone. SecureStash staff will never ask for your code.
      </p>
    </div>
    <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
      SecureStash Cloud Vault &bull; Automated Security Verification
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
            from: `"SecureStash" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text: `Hello ${name},\n\nYour SecureStash verification code is: ${code}\n\nThis code will expire in 10 minutes.\nNever share this code with anyone.`,
            html
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
