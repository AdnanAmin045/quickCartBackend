const jwt = require("jsonwebtoken");
const secret_key = process.env.SECRET_KEY;
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(403).json({ message: "Access denied, token missing" });
    }
    try {
        const verified = jwt.verify(token, secret_key);
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};


module.exports = verifyToken