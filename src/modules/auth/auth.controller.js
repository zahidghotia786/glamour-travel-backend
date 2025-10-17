import sendPasswordResetEmail from "../emails/email.service.js";
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile 
} from "./auth.service.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../models/users/model.js";


// ✅ Registration
export const register = async (req, res) => {
  try {
    const { token, user } = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "Please Verify Email.",
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


// ✅ Login
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

    if (err.message.includes("verify your email")) {
      return res.status(400).json({
        success: false,
        error: err.message,
        needsVerification: true
      });
    }

    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};


// ✅ Get User Profile
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


// ✅ Update User Profile
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


// ✅ Forgot Password - Send Reset Email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log(user)

    if (!user) {
      // Don't reveal if user doesn't exist
      return res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent"
      });
    }

    // Generate password reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        purpose: "password_reset"
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Send reset email
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


// ✅ Reset Password - Verify Token & Update Password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Token and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long"
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({
        success: false,
        error: "Invalid token purpose"
      });
    }

    // Find user by ID
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

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
