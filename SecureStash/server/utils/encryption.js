const crypto = require("crypto");
const fs = require("fs");

const ALGORITHM = "aes-256-cbc";
const MAGIC_HEADER = Buffer.from("SECURESTASH_ENC_V1:");
const IV_LENGTH = 16;

function getEncryptionKey() {
    const secret = process.env.JWT_SECRET || "SecureStash_Military_Grade_Key_2026";
    return crypto.scryptSync(secret, "securestash_salt_key_vault", 32);
}

function encryptFileInPlace(filePath) {
    if (!fs.existsSync(filePath)) return;

    const rawBuffer = fs.readFileSync(filePath);
    if (rawBuffer.length >= MAGIC_HEADER.length &&
        rawBuffer.subarray(0, MAGIC_HEADER.length).equals(MAGIC_HEADER)) {
        return;
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encryptedData = Buffer.concat([cipher.update(rawBuffer), cipher.final()]);

    const finalBuffer = Buffer.concat([MAGIC_HEADER, iv, encryptedData]);
    fs.writeFileSync(filePath, finalBuffer);
}

function decryptFileToBuffer(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error("File does not exist on storage disk");
    }

    const fileBuffer = fs.readFileSync(filePath);
    if (fileBuffer.length < MAGIC_HEADER.length ||
        !fileBuffer.subarray(0, MAGIC_HEADER.length).equals(MAGIC_HEADER)) {
        return fileBuffer;
    }

    const key = getEncryptionKey();
    const iv = fileBuffer.subarray(MAGIC_HEADER.length, MAGIC_HEADER.length + IV_LENGTH);
    const encryptedData = fileBuffer.subarray(MAGIC_HEADER.length + IV_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted;
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
    encryptFileInPlace,
    decryptFileToBuffer,
    encryptAllExistingUploads
};
