
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../config/db.js";
import { sendVerificationEmail } from "../emails/email.service.js";

// Register new User (Customer or B2B)
export const registerUser = async (userData) => {
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    dateOfBirth,
    nationality,
    password,
    role = "CUSTOMER",
    preferredLanguage = "en",
    companyName,
    businessLicense
  } = userData;

  // Validate required fields
  if (!firstName || !lastName || !email || !phoneNumber || !nationality || !password) {
    throw new Error("Missing required fields: firstName, lastName, email, phoneNumber, nationality, password");
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("User already exists with this email address");

  // Validate password strength
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  // Validate role
  const validRoles = ["CUSTOMER", "B2B", "customer", "business"];
  const normalizedRole = role.toUpperCase() === "BUSINESS" ? "B2B" : role.toUpperCase();
  
  if (!["CUSTOMER", "B2B"].includes(normalizedRole)) {
    throw new Error("Invalid role. Must be CUSTOMER or B2B");
  }

  // For B2B accounts, company name is required
  if (normalizedRole === "B2B" && !companyName) {
    throw new Error("Company name is required for business accounts");
  }

  // Validate phone number format (basic validation)
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new Error("Please provide a valid phone number");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Prepare user data
  const userCreateData = {
    firstName,
    lastName,
    email: email.toLowerCase().trim(),
    phoneNumber,
    nationality,
    password: hashedPassword,
    role: normalizedRole,
    preferredLanguage: ["en", "ar", "ru"].includes(preferredLanguage) ? preferredLanguage : "en",
  };

  // Add date of birth if provided
  if (dateOfBirth) {
    userCreateData.dateOfBirth = new Date(dateOfBirth);
  }

  // Add business fields if B2B
  if (normalizedRole === "B2B") {
    userCreateData.companyName = companyName;
    if (businessLicense) {
      userCreateData.businessLicense = businessLicense;
    }
  }

  try {
    // Create user in database
    const user = await prisma.user.create({
      data: userCreateData,
    });

        // Generate email verification token
    const verificationToken = jwt.sign(
      { 
        id: user.id,
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" } // Token expires in 24 hours
    );

      // Send verification email (you'll need to implement this function)
    await sendVerificationEmail(user.email, verificationToken, user.firstName);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Extended to 7 days for better UX
    );

    // Return safe user data (exclude password)
    const safeUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      nationality: user.nationality,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      ...(user.companyName && { companyName: user.companyName }),
      ...(user.businessLicense && { businessLicense: user.businessLicense }),
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { token, user: safeUser };

  } catch (error) {
    if (error.code === 'P2002') {
      throw new Error("User already exists with this email address");
    }
    throw new Error(`Registration failed: ${error.message}`);
  }
};

// auth.service.js - loginUser function update
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Find user by email
  const user = await prisma.user.findUnique({ 
    where: { email: email.toLowerCase().trim() } 
  });
  
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error("Account has been deactivated. Please contact support.");
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new Error("Please verify your email first. Check your inbox for verification link.");
  }


  // Verify password
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  // Generate JWT token
  const token = jwt.sign(
    { 
      id: user.id, 
      role: user.role,
      email: user.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Return safe user data
  const safeUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phoneNumber: user.phoneNumber,
    nationality: user.nationality,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    ...(user.companyName && { companyName: user.companyName }),
    ...(user.businessLicense && { businessLicense: user.businessLicense }),
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { token, user: safeUser };
};
// Get user profile
export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      dateOfBirth: true,
      nationality: true,
      role: true,
      preferredLanguage: true,
      companyName: true,
      businessLicense: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    ...user,
    name: `${user.firstName} ${user.lastName}`, // For backward compatibility
  };
};

// Update user profile
export const updateUserProfile = async (userId, updateData) => {
  const allowedFields = [
    'firstName', 'lastName', 'phoneNumber', 'nationality', 
    'preferredLanguage', 'companyName', 'businessLicense'
  ];
  
  const filteredData = {};
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredData[key] = updateData[key];
    }
  });

  if (Object.keys(filteredData).length === 0) {
    throw new Error("No valid fields to update");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: filteredData,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      dateOfBirth: true,
      nationality: true,
      role: true,
      preferredLanguage: true,
      companyName: true,
      businessLicense: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  return {
    ...user,
    name: `${user.firstName} ${user.lastName}`,
  };
};



