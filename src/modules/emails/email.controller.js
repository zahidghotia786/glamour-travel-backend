import prisma from "../../config/db.js";
import jwt from "jsonwebtoken";

// auth.controller.js - Updated verifyEmail function
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Verification token is required"
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "Email already verified"
      });
    }

    // Update user to mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true }
    });

    // JSON response for API call
    res.json({
      success: true,
      message: "Email verified successfully"
    });
    
  } catch (err) {
    console.error("Email verification error:", err);
    
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({
        success: false,
        error: "Verification link expired. Please request a new one."
      });
    }
    
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({
        success: false,
        error: "Invalid verification token."
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Email verification failed."
    });
  }
};