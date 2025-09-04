import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import { fileURLToPath } from 'url';

// ES modules mein __dirname ka alternative
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create transporter with better configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Additional settings for better reliability
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

// Verify transporter connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter verification failed:", error);
  } else {
    console.log("Email transporter is ready to send messages");
  }
});

// Load and compile templates with better error handling
const templates = {};

const loadTemplates = () => {
  const templatesDir = path.join(__dirname, "templates");
  
  // Create templates directory if it doesn't exist
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
    console.log("Created templates directory:", templatesDir);
  }
  
  try {
    // Verification template with fallback
    let verificationTemplateSource;
    const verificationTemplatePath = path.join(templatesDir, "verification.html");
    
    if (fs.existsSync(verificationTemplatePath)) {
      verificationTemplateSource = fs.readFileSync(verificationTemplatePath, "utf8");
    } else {
      console.warn("Verification template not found, using fallback");
      verificationTemplateSource = `
        <!DOCTYPE html>
        <html>
        <body>
          <h2>Welcome to Glamour Tours UAE!</h2>
          <p>Dear {{firstName}},</p>
          <p>Please verify your email by clicking the link below:</p>
          <a href="{{verificationLink}}">Verify Email</a>
          <p>Or copy this URL: {{verificationLink}}</p>
        </body>
        </html>
      `;
    }
    templates.verification = handlebars.compile(verificationTemplateSource);
    
    // Reset password template
    let resetPasswordTemplateSource;
    const resetPasswordTemplatePath = path.join(templatesDir, "reset-password.html");
    
    if (fs.existsSync(resetPasswordTemplatePath)) {
      resetPasswordTemplateSource = fs.readFileSync(resetPasswordTemplatePath, "utf8");
    } else {
      console.warn("Reset password template not found, using fallback");
      resetPasswordTemplateSource = `
        <!DOCTYPE html>
        <html>
        <body>
          <h2>Reset Your Password</h2>
          <p>Hello {{firstName}},</p>
          <p>Click the link below to reset your password:</p>
          <a href="{{resetLink}}">Reset Password</a>
          <p>Or copy this URL: {{resetLink}}</p>
        </body>
        </html>
      `;
    }
    templates.resetPassword = handlebars.compile(resetPasswordTemplateSource);
    
    // B2B Welcome template
    let b2bWelcomeTemplateSource;
    const b2bWelcomeTemplatePath = path.join(templatesDir, "b2b-welcome.html");
    
    if (fs.existsSync(b2bWelcomeTemplatePath)) {
      b2bWelcomeTemplateSource = fs.readFileSync(b2bWelcomeTemplatePath, "utf8");
    } else {
      console.warn("B2B welcome template not found, using fallback");
      b2bWelcomeTemplateSource = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #2563eb, #4f46e5); padding: 20px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
            .credentials { background: #e0e7ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our B2B Platform</h1>
            </div>
            <div class="content">
              <p>Dear {{firstName}},</p>
              <p>Your B2B account has been successfully created for <strong>{{companyName}}</strong>.</p>
              
              <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> {{email}}</p>
                <p><strong>Password:</strong> {{password}}</p>
                <p><em>Please change your password after first login for security.</em></p>
              </div>
              
              <p>You can now access our B2B portal with special pricing and features.</p>
              <p><a href="{{frontendUrl}}/login" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Your Account</a></p>
              
              <p>Best regards,<br>B2B Team</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }
    templates.b2bWelcome = handlebars.compile(b2bWelcomeTemplateSource);
    
    console.log("Email templates loaded successfully");
  } catch (error) {
    console.error("Error loading email templates:", error);
    throw error;
  }
};

// Initialize templates on startup
try {
  loadTemplates();
} catch (error) {
  console.error("Failed to load email templates:", error);
}

// Generic email sending function with retry logic
const sendEmail = async (to, subject, html, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Attempt ${i + 1} failed to send email to ${to}:`, error);
      
      if (i === retries - 1) {
        return { 
          success: false, 
          error: error.message,
          details: `Failed after ${retries} attempts`
        };
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

// Send verification email
const sendVerificationEmail = async (email, token, firstName) => {
  try {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const html = templates.verification({
      firstName: firstName || "User",
      verificationLink
    });
    
    return await sendEmail(
      email,
      "Verify Your Email - Glamour Tours UAE",
      html
    );
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, firstName) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const html = templates.resetPassword({
      firstName: firstName || "User",
      resetLink
    });
    
    return await sendEmail(
      email,
      "Reset Your Password - Glamour Tours UAE",
      html
    );
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: error.message };
  }
};

// Send B2B welcome email
const sendB2BWelcomeEmail = async (email, firstName, password, companyName, markupType, markupValue) => {
  try {
    const html = templates.b2bWelcome({
      firstName: firstName || "User",
      email,
      password,
      companyName,
      markupType: markupType || "percentage",
      markupValue: markupValue || 0,
      frontendUrl: process.env.FRONTEND_URL
    });
    
    return await sendEmail(
      email,
      "Welcome to Our B2B Platform - Glamour Tours UAE",
      html
    );
  } catch (error) {
    console.error("Error sending B2B welcome email:", error);
    return { success: false, error: error.message };
  }
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendB2BWelcomeEmail
};