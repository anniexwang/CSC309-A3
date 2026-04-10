const { expressjwt } = require("express-jwt");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_assignment";

const requireAuth = expressjwt({
  secret: JWT_SECRET,
  algorithms: ["HS256"],
  requestProperty: "auth"
});

const optionalAuth = expressjwt({
  secret: JWT_SECRET,
  algorithms: ["HS256"],
  requestProperty: "auth",
  credentialsRequired: false
});

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return res.status(401).json({ error: `Unauthorized: ${req.auth.role}` });
    }
    if (role && req.auth.role !== role) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
};

function requireRoles(roles) {
    return (req, res, next) => {
        if (!req.auth) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        if (!roles.includes(req.auth.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        next();
    };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  JWT_SECRET,
  requireRoles
};
