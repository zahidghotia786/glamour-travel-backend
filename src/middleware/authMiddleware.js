import jwt from "jsonwebtoken";
import User from "../models/users/model.js"; 

// Authenticate token middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access token is required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Optional: Verify user still exists and is active using Mongoose
    const user = await User.findById(decoded.id).select('id role isActive');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

// Role-based access control
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
      });
    }

    next();
  };
};
