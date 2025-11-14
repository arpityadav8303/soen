import jwt from "jsonwebtoken";
import { tokenBlacklist } from "../controllers/user.controller.js";

export const authUser = async (req, res, next) => {
    try {
        const token =
            req.cookies.token ||
            (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

        if (!token) {
            return res.status(401).send({ error: 'Unauthorized User' });
        }

        // Check if token is blacklisted (logged out)
        if (tokenBlacklist.has(token)) {
            return res.status(401).send({ error: 'Token has been revoked' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).send({ error: 'Unauthorized User' });
    }
}