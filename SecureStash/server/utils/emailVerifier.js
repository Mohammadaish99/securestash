const dns = require("dns").promises;

// Known disposable, temporary, and burner email domains to block
const DISPOSABLE_DOMAINS = new Set([
    "tempmail.com", "temp-mail.org", "temp-mail.io", "10minutemail.com", "10minutemail.net",
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.biz",
    "yopmail.com", "yopmail.net", "trashmail.com", "trashmail.net", "sharklasers.com",
    "dispostable.com", "getairmail.com", "fakemailgenerator.com", "throwawaymail.com",
    "burnermail.io", "crazymailing.com", "tempail.com", "nada.ltd", "inboxkitten.com",
    "dropmail.me", "mohmal.com", "mytemp.email", "emailondeck.com", "tempinbox.com",
    "getnada.com", "maildrop.cc", "generator.email", "fakeinbox.com", "armyspy.com",
    "cuvox.de", "dayrep.com", "fleckens.hu", "gustr.com", "jourrapide.com", "rhyta.com",
    "superrito.com", "teleworm.us", "einrot.com"
]);

/**
 * Validates whether an email is genuine:
 * 1. Checks valid email syntax
 * 2. Blocks disposable / temporary burner domains
 * 3. Performs authoritative DNS MX lookup to confirm domain actually receives mail
 */
async function verifyGenuineEmail(email) {
    if (!email || typeof email !== "string") {
        return {
            isValid: false,
            message: "Email address is required."
        };
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Basic RFC syntax format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
        return {
            isValid: false,
            message: "Please enter a properly formatted email address (e.g. name@domain.com)."
        };
    }

    const parts = cleanEmail.split("@");
    if (parts.length !== 2) {
        return {
            isValid: false,
            message: "Invalid email format."
        };
    }

    const [userPart, domain] = parts;

    // Disallow trivial fake local parts
    if (userPart.length < 2) {
        return {
            isValid: false,
            message: "Email username must be at least 2 characters long."
        };
    }

    // 2. Disposable / Burner email check
    if (DISPOSABLE_DOMAINS.has(domain)) {
        return {
            isValid: false,
            message: `Disposable or temporary emails (@${domain}) are prohibited. Please use a genuine, personal or institutional email.`
        };
    }

    // 3. DNS MX Record Verification
    try {
        const mxRecords = await dns.resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) {
            return {
                isValid: false,
                message: `The domain '@${domain}' does not have any active mail servers (MX records) and cannot receive emails. Please enter a genuine email.`
            };
        }

        return {
            isValid: true,
            email: cleanEmail,
            domain
        };
    } catch (dnsError) {
        // Domain does not exist or has no DNS entries
        if (dnsError.code === "ENOTFOUND" || dnsError.code === "ENODATA" || dnsError.code === "SERVFAIL") {
            return {
                isValid: false,
                message: `The email domain '@${domain}' does not exist or is not registered. Please use a genuine email address.`
            };
        }

        // In case DNS query timed out, fallback to basic domain validation
        console.warn(`DNS lookup warning for ${domain}:`, dnsError.message);
        return {
            isValid: true,
            email: cleanEmail,
            domain
        };
    }
}

module.exports = {
    verifyGenuineEmail
};
