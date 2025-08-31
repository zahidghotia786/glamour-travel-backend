import sendPasswordResetEmail from "../emails/email.service.js";
import { registerUser, loginUser, getUserProfile, updateUserProfile } from "./auth.service.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../config/db.js";


// Registration
export const register = async (req, res) => {
  try {
    const { token, user } = await registerUser(req.body);
    
    res.status(201).json({
      success: true,
      message: "Account created successfully! Welcome to Glamour Tours UAE.",
      token,
      role: user.role,
      user,
    });
  } catch (err) {
    console.error("Registration Error:", err.message);
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// auth.controller.js - login function
export const login = async (req, res) => {
  try {
    const { token, user } = await loginUser(req.body);
    
    res.json({
      success: true,
      message: `Welcome back, ${user.firstName}!`,
      token,
      role: user.role,
      user,
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    
    // Specific error message for unverified email
    if (err.message.includes("verify your email")) {
      return res.status(400).json({  // Change from 403 to 400
        success: false,
        error: err.message,
        needsVerification: true // Frontend ke liye flag
      });
    }
    
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await getUserProfile(req.user.id);
    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Get Profile Error:", err.message);
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const user = await updateUserProfile(req.user.id, req.body);
    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error("Update Profile Error:", err.message);
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};




// Forgot password - send reset email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent"
      });
    }

    // Generate password reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        purpose: "password_reset" // Different purpose than verification
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(
      user.email,
      resetToken,
      user.firstName
    );

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
    }

    res.json({
      success: true,
      message: "If the email exists, a password reset link has been sent"
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process password reset request"
    });
  }
};

// Reset password - verify token and update password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Token and new password are required"
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long"
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is for password reset
    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({
        success: false,
        error: "Invalid token purpose"
      });
    }

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

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        // Optional: Invalidate all existing tokens by changing token version
      }
    });

    res.json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error("Reset password error:", error);
    
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        success: false,
        error: "Password reset link has expired. Please request a new one."
      });
    }
    
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({
        success: false,
        error: "Invalid reset token."
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to reset password"
    });
  }
};