const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { encryptBuffer, decryptBuffer } = require("./encryption");

const BUCKET_NAME = "vault_uploads";
let cachedBucket = null;

/**
 * Returns the GridFS bucket instance attached to the active Mongoose connection.
 */
function getGridFSBucket() {
    if (mongoose.connection.readyState !== 1) {
        return null;
    }
    if (!cachedBucket || cachedBucket.s.db !== mongoose.connection.db) {
        cachedBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: BUCKET_NAME
        });
    }
    return cachedBucket;
}

/**
 * Checks if a file exists in MongoDB GridFS by filename.
 * @param {string} filename 
 * @returns {Promise<Object|null>} GridFS file document if found, null otherwise.
 */
async function findFileInGridFS(filename) {
    const bucket = getGridFSBucket();
    if (!bucket) return null;

    try {
        const files = await bucket.find({ filename }).sort({ uploadDate: -1 }).limit(1).toArray();
        return files.length > 0 ? files[0] : null;
    } catch (err) {
        console.error("findFileInGridFS Error:", err.message);
        return null;
    }
}

/**
 * Uploads a file buffer (automatically AES-256 encrypted) into MongoDB GridFS.
 * @param {string} filename - Unique file identifier (e.g. 1789730252970-932942176.png)
 * @param {Buffer} buffer - Raw or encrypted file data
 * @param {Object} metadata - Optional metadata (owner, originalName, contentType)
 * @returns {Promise<Object>} The uploaded GridFS file object
 */
async function uploadBufferToGridFS(filename, buffer, metadata = {}) {
    const bucket = getGridFSBucket();
    if (!bucket) {
        throw new Error("MongoDB Atlas connection not ready for GridFS upload");
    }

    // Ensure the buffer is AES-256 encrypted before writing to MongoDB Atlas
    const encryptedBuffer = encryptBuffer(buffer);

    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename, {
            contentType: metadata.contentType || "application/octet-stream",
            metadata: {
                originalName: metadata.originalName || filename,
                owner: metadata.owner || null,
                uploadedAt: new Date()
            }
        });

        uploadStream.on("error", (error) => {
            console.error(`GridFS upload error for ${filename}:`, error);
            reject(error);
        });

        uploadStream.on("finish", () => {
            console.log(`📦 [GridFS Persisted] ${filename} (${encryptedBuffer.length} bytes encrypted) safely stored in MongoDB Atlas`);
            resolve({ _id: uploadStream.id, filename, length: encryptedBuffer.length });
        });

        uploadStream.end(encryptedBuffer);
    });
}

/**
 * Retrieves and decrypts a file from MongoDB GridFS as a Buffer.
 * @param {string} filename 
 * @returns {Promise<{ buffer: Buffer, fileDoc: Object }|null>}
 */
async function getFileBufferFromGridFS(filename) {
    const bucket = getGridFSBucket();
    if (!bucket) return null;

    const fileDoc = await findFileInGridFS(filename);
    if (!fileDoc) return null;

    return new Promise((resolve, reject) => {
        const downloadStream = bucket.openDownloadStreamByName(filename);
        const chunks = [];

        downloadStream.on("data", (chunk) => {
            chunks.push(chunk);
        });

        downloadStream.on("error", (err) => {
            console.error(`GridFS download error for ${filename}:`, err);
            reject(err);
        });

        downloadStream.on("end", () => {
            const rawEncrypted = Buffer.concat(chunks);
            try {
                const decrypted = decryptBuffer(rawEncrypted);
                resolve({ buffer: decrypted, fileDoc });
            } catch (decErr) {
                console.error("Decryption error for GridFS file:", decErr);
                // Return encrypted buffer fallback if decryption fails
                resolve({ buffer: rawEncrypted, fileDoc });
            }
        });
    });
}

/**
 * Deletes a file from MongoDB GridFS by filename.
 * @param {string} filename 
 */
async function deleteFileFromGridFS(filename) {
    const bucket = getGridFSBucket();
    if (!bucket) return;

    try {
        const files = await bucket.find({ filename }).toArray();
        for (const f of files) {
            await bucket.delete(f._id);
            console.log(`🗑️ [GridFS Deleted] ${filename} removed from MongoDB Atlas`);
        }
    } catch (err) {
        console.warn(`GridFS delete notice for ${filename}:`, err.message);
    }
}

/**
 * Automatically migrates any local disk files from server/uploads into MongoDB Atlas GridFS.
 * Ensures that files already on disk are permanently backed up to the cloud.
 * @param {string} uploadsDir 
 */
async function migrateDiskFilesToGridFS(uploadsDir) {
    if (!fs.existsSync(uploadsDir)) return;
    if (mongoose.connection.readyState !== 1) return;

    try {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
            if (file === ".gitkeep" || file.startsWith(".")) continue;
            const filePath = path.join(uploadsDir, file);

            try {
                if (!fs.statSync(filePath).isFile()) continue;

                const existingInGrid = await findFileInGridFS(file);
                if (!existingInGrid) {
                    const fileContent = fs.readFileSync(filePath);
                    await uploadBufferToGridFS(file, fileContent, {
                        originalName: file,
                        migratedFromDisk: true
                    });
                    console.log(`✅ [GridFS Auto-Migrated] "${file}" is now permanently preserved in MongoDB Atlas`);
                }
            } catch (fileErr) {
                console.warn(`Migration notice for ${file}:`, fileErr.message);
            }
        }
    } catch (err) {
        console.error("migrateDiskFilesToGridFS Error:", err.message);
    }
}

module.exports = {
    getGridFSBucket,
    findFileInGridFS,
    uploadBufferToGridFS,
    getFileBufferFromGridFS,
    deleteFileFromGridFS,
    migrateDiskFilesToGridFS
};
