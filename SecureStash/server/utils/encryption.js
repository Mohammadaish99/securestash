const crypto = require("crypto");
const fs = require("fs");

const ALGORITHM = "aes-256-cbc";
const MAGIC_HEADER = Buffer.from("SECURESTASH_ENC_V1:");
const IV_LENGTH = 16;

function getEncryptionKey() {
    const secret = process.env.JWT_SECRET || "SecureStash_Military_Grade_Key_2026";
    return crypto.scryptSync(secret, "securestash_salt_key_vault", 32);
}

function encryptBuffer(rawBuffer) {
    if (!rawBuffer || rawBuffer.length === 0) return rawBuffer;
    if (rawBuffer.length >= MAGIC_HEADER.length &&
        rawBuffer.subarray(0, MAGIC_HEADER.length).equals(MAGIC_HEADER)) {
        return rawBuffer;
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encryptedData = Buffer.concat([cipher.update(rawBuffer), cipher.final()]);
    return Buffer.concat([MAGIC_HEADER, iv, encryptedData]);
}

function decryptBuffer(buffer) {
    if (!buffer || buffer.length < MAGIC_HEADER.length ||
        !buffer.subarray(0, MAGIC_HEADER.length).equals(MAGIC_HEADER)) {
        return buffer;
    }

    const key = getEncryptionKey();
    const iv = buffer.subarray(MAGIC_HEADER.length, MAGIC_HEADER.length + IV_LENGTH);
    const encryptedData = buffer.subarray(MAGIC_HEADER.length + IV_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted;
}

function encryptFileInPlace(filePath) {
    if (!fs.existsSync(filePath)) return;

    const rawBuffer = fs.readFileSync(filePath);
    const finalBuffer = encryptBuffer(rawBuffer);
    if (finalBuffer !== rawBuffer) {
        fs.writeFileSync(filePath, finalBuffer);
    }
}

function decryptFileToBuffer(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error("File does not exist on storage disk");
    }

    const fileBuffer = fs.readFileSync(filePath);
    return decryptBuffer(fileBuffer);
}

const path = require("path");

function encryptAllExistingUploads(uploadsDir) {
    if (!fs.existsSync(uploadsDir)) return;
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
        if (file === ".gitkeep" || file.startsWith(".")) continue;
        const filePath = path.join(uploadsDir, file);
        try {
            if (fs.statSync(filePath).isFile()) {
                encryptFileInPlace(filePath);
            }
        } catch (err) {
            console.warn(`Could not encrypt ${file}:`, err.message);
        }
    }
}

module.exports = {
    encryptBuffer,
    decryptBuffer,
    encryptFileInPlace,
    decryptFileToBuffer,
    encryptAllExistingUploads
};

