const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Normalize different role names into one standard format
const normalizeRole = (role) => {
    const r = (role || "").toString().trim().toLowerCase();

    const roleMap = {
        "main_admin": "main_admin",
        "main-admin": "main_admin",
        "mainadmin": "main_admin",

        "nhg_secretary": "nhg_secretary",
        "nhg-secretary": "nhg_secretary",
        "secretary": "nhg_secretary",

        "member": "member",

        "ads_cds_officer": "ads_cds_officer",
        "ads-cds-officer": "ads_cds_officer",
        "adscdsofficer": "ads_cds_officer",
        "ads_officer": "ads_officer",
        "ads-officer": "ads_officer",
        "cds_officer": "cds_officer",
        "cds-officer": "cds_officer",
        "bank_officer": "bank_officer",
        "bank-officer": "bank_officer"
    };

    return roleMap[r] || r;
};


// Protect routes - login required
const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from Authorization header
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. Please login."
            });
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "kconnect_secret"
        );

        // Get user from database
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found."
            });
        }

        if (normalizeRole(user.role) === "member") {
            const Member = require("../models/Member");
            let member = user.memberId ? await Member.findOne({ memberId: user.memberId }) : null;
            if (member?.email && member.email.toLowerCase() !== user.email.toLowerCase()) member = null;
            if (!member) member = await Member.findOne({ email: user.email.toLowerCase() });

            if (!member || member.status !== "Active") {
                const status = member?.status || "Pending";
                const message = status === "Pending"
                    ? "Your membership request is waiting for approval from your NHG Secretary."
                    : status === "Rejected"
                    ? `Your membership request was not approved.${member.rejectionReason ? ` Reason: ${member.rejectionReason}` : " Please contact your NHG Secretary."}`
                    : "Your membership is inactive. Please contact your NHG Secretary.";
                return res.status(403).json({ success: false, status, message });
            }
        }

        // Attach user to request
        req.user = user;

        next();

    } catch (error) {
        console.error("Auth error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
};


// Optional authentication
// If token exists -> identify user
// If token does not exist -> continue without user
const optionalProtect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        // No token -> continue normally
        if (!token) {
            req.user = null;
            return next();
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "kconnect_secret"
        );

        // Find user
        const user = await User.findById(decoded.id).select("-password");

        req.user = user || null;

        next();

    } catch (error) {
        // Invalid token should not crash the server
        req.user = null;
        next();
    }
};


// Authorize specific roles
const authorize = (...roles) => {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. Please login."
            });
        }

        const userRole = normalizeRole(req.user.role);

        const allowedRoles = roles.map((role) =>
            normalizeRole(role)
        );

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource."
            });
        }

        next();
    };
};


module.exports = {
    protect,
    optionalProtect,
    authorize,
    normalizeRole
};
