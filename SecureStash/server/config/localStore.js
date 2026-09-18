const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "local_db.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function generateId() {
    return crypto.randomBytes(12).toString("hex");
}

let db = {
    users: [],
    folders: [],
    files: [],
    shares: []
};

function seedDefaultData() {
    const alexId = "660000000000000000000001";
    const hashedPassword = bcrypt.hashSync("SecurePassword123!@#", 10);

    db.users = [
        {
            _id: alexId,
            name: "Alex Mercer",
            email: "alex.mercer@example.com",
            password: hashedPassword,
            resetPasswordCode: null,
            resetPasswordExpires: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    const folderId = "660000000000000000000002";
    db.folders = [
        {
            _id: folderId,
            name: "Personal Documents",
            owner: alexId,
            parentFolder: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    db.files = [
        {
            _id: "660000000000000000000003",
            name: "Getting_Started.pdf",
            originalName: "Getting_Started.pdf",
            fileUrl: "/uploads/Getting_Started.pdf",
            fileType: "application/pdf",
            fileSize: 1048576,
            owner: alexId,
            folder: folderId,
            isStarred: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    db.shares = [];
}

function loadDb() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, "utf8");
            db = JSON.parse(data);
            if (!db.users || db.users.length === 0) {
                seedDefaultData();
                saveDb();
            }
        } else {
            seedDefaultData();
            saveDb();
        }
    } catch (e) {
        console.error("Error loading local DB:", e);
        seedDefaultData();
    }
}

function saveDb() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
    } catch (e) {
        console.error("Error saving local DB:", e);
    }
}

loadDb();

function matchesQuery(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;

    for (const [key, val] of Object.entries(query)) {
        const docVal = doc[key];
        const docValStr = docVal !== undefined && docVal !== null ? String(docVal) : null;

        if (val && typeof val === "object" && val.$ne !== undefined) {
            if (val.$ne === null) {
                if (docVal === null || docVal === undefined) return false;
            } else if (docValStr === String(val.$ne)) {
                return false;
            }
        } else {
            const expectedStr = val !== undefined && val !== null ? String(val) : null;
            if (docValStr !== expectedStr) {
                return false;
            }
        }
    }
    return true;
}

function wrapDoc(collectionName, doc) {
    if (!doc) return null;
    const clone = { ...doc };

    Object.defineProperty(clone, "save", {
        enumerable: false,
        value: async function () {
            clone.updatedAt = new Date().toISOString();
            const list = db[collectionName];
            const idx = list.findIndex((d) => String(d._id) === String(clone._id));
            if (idx !== -1) {
                list[idx] = { ...clone };
            } else {
                list.push({ ...clone });
            }
            saveDb();
            return clone;
        }
    });

    return clone;
}

function createQueryChain(collectionName, items) {
    let result = items.map((d) => wrapDoc(collectionName, d));

    const chain = {
        sort(sortObj) {
            if (sortObj) {
                const [sortField, dir] = Object.entries(sortObj)[0];
                result.sort((a, b) => {
                    const av = a[sortField];
                    const bv = b[sortField];
                    if (av < bv) return dir === -1 ? 1 : -1;
                    if (av > bv) return dir === -1 ? -1 : 1;
                    return 0;
                });
            }
            return chain;
        },

        populate(field, selectFields) {
            result = result.map((item) => {
                const copy = { ...item };
                const refId = copy[field];
                if (refId) {
                    let refColl = null;
                    if (field === "owner" || field === "sharedWith") refColl = "users";
                    else if (field === "file") refColl = "files";
                    else if (field === "folder") refColl = "folders";

                    if (refColl && db[refColl]) {
                        const target = db[refColl].find(
                            (x) => String(x._id) === String(refId)
                        );
                        if (target) {
                            if (selectFields && typeof selectFields === "string") {
                                const allowed = selectFields.split(" ");
                                const selected = { _id: target._id };
                                allowed.forEach((k) => {
                                    if (target[k] !== undefined) selected[k] = target[k];
                                });
                                copy[field] = selected;
                            } else {
                                copy[field] = { ...target };
                            }
                        }
                    }
                }
                return copy;
            });
            return chain;
        },

        then(resolve, reject) {
            return Promise.resolve(result).then(resolve, reject);
        }
    };

    return chain;
}

function createModel(collectionName) {
    return {
        async findOne(query) {
            const list = db[collectionName] || [];
            const found = list.find((d) => matchesQuery(d, query));
            return wrapDoc(collectionName, found);
        },

        async findById(id) {
            const list = db[collectionName] || [];
            const found = list.find((d) => String(d._id) === String(id));
            return wrapDoc(collectionName, found);
        },

        find(query) {
            const list = db[collectionName] || [];
            const filtered = list.filter((d) => matchesQuery(d, query));
            return createQueryChain(collectionName, filtered);
        },

        async create(data) {
            const list = db[collectionName] || [];
            const id = data._id ? String(data._id) : generateId();
            const now = new Date().toISOString();
            const doc = {
                ...data,
                _id: id,
                createdAt: now,
                updatedAt: now
            };
            list.push(doc);
            saveDb();
            return wrapDoc(collectionName, doc);
        },

        async findOneAndUpdate(query, update, options) {
            const list = db[collectionName] || [];
            const idx = list.findIndex((d) => matchesQuery(d, query));
            if (idx === -1) return null;
            const updated = {
                ...list[idx],
                ...update,
                updatedAt: new Date().toISOString()
            };
            list[idx] = updated;
            saveDb();
            return wrapDoc(collectionName, updated);
        },

        async findByIdAndUpdate(id, update, options) {
            return this.findOneAndUpdate({ _id: id }, update, options);
        },

        async findOneAndDelete(query) {
            const list = db[collectionName] || [];
            const idx = list.findIndex((d) => matchesQuery(d, query));
            if (idx === -1) return null;
            const removed = list.splice(idx, 1)[0];
            saveDb();
            return wrapDoc(collectionName, removed);
        },

        async deleteOne(query) {
            const list = db[collectionName] || [];
            const idx = list.findIndex((d) => matchesQuery(d, query));
            if (idx !== -1) {
                list.splice(idx, 1);
                saveDb();
                return { deletedCount: 1 };
            }
            return { deletedCount: 0 };
        },

        async deleteMany(query) {
            const list = db[collectionName] || [];
            const before = list.length;
            db[collectionName] = list.filter((d) => !matchesQuery(d, query));
            saveDb();
            return { deletedCount: before - db[collectionName].length };
        },

        async updateMany(query, update) {
            const list = db[collectionName] || [];
            let count = 0;
            list.forEach((doc, i) => {
                if (matchesQuery(doc, query)) {
                    list[i] = { ...doc, ...update, updatedAt: new Date().toISOString() };
                    count++;
                }
            });
            if (count > 0) saveDb();
            return { modifiedCount: count };
        }
    };
}

module.exports = {
    localDb: db,
    LocalUser: createModel("users"),
    LocalFolder: createModel("folders"),
    LocalFile: createModel("files"),
    LocalShare: createModel("shares"),
    saveDb,
    loadDb
};
