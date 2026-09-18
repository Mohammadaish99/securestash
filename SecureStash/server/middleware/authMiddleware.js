const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
    try {
        let token = null;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                message: "Access denied. No token provided."
            });
        }

        const secret = process.env.JWT_SECRET || "SecureStash_Default_Secret_2026";

        const decoded = jwt.verify(token, secret);

        req.user = decoded.userId;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
};

module.exports = protect;