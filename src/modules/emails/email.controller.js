import prisma from "../../config/db.js";
import jwt from "jsonwebtoken";
import emailService from "../emails/email.service.js";


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



// email.controller.js - Add this function

export const resendVerification = async (req, res) => {
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
      where: { email }
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: "If the email exists, a verification link has been sent."
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "Email is already verified"
      });
    }

    // Generate new verification token
    const verificationToken = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        type: 'email_verification'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken, user.firstName);


    res.json({
      success: true,
      message: "Verification email sent successfully"
    });

  } catch (err) {
    console.error("Resend verification error:", err);
    
    res.status(500).json({
      success: false,
      error: "Failed to resend verification email"
    });
  }
};