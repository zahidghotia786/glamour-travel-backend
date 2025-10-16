
import jwt from "jsonwebtoken";
import emailService from "../emails/email.service.js";
import User from '../../models/users/model.js';

// ✅ Register new User (Customer or B2B)
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
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) throw new Error("User already exists with this email address");

  // Validate password strength
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  // Validate role
  const normalizedRole = role.toUpperCase() === "BUSINESS" ? "B2B" : role.toUpperCase();
  if (!["CUSTOMER", "B2B"].includes(normalizedRole)) {
    throw new Error("Invalid role. Must be CUSTOMER or B2B");
  }

  // For B2B accounts, company name is required
  if (normalizedRole === "B2B" && !companyName) {
    throw new Error("Company name is required for business accounts");
  }

  // Validate phone number format
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new Error("Please provide a valid phone number");
  }

  // ✅ Prepare user data
  const userCreateData = {
    firstName,
    lastName,
    email: email.toLowerCase().trim(),
    phoneNumber,
    nationality,
    password, // hashing handled by pre-save hook in schema
    role: normalizedRole,
    preferredLanguage: ["en", "ar", "ru"].includes(preferredLanguage) ? preferredLanguage : "en",
  };

  if (dateOfBirth) userCreateData.dateOfBirth = new Date(dateOfBirth);
  if (normalizedRole === "B2B") {
    userCreateData.companyName = companyName;
    if (businessLicense) userCreateData.businessLicense = businessLicense;
  }

  // ✅ Create user in database
  const user = await User.create(userCreateData);

  // Generate email verification token
  const verificationToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  // Send verification email
  await emailService.sendVerificationEmail(user.email, verificationToken, user.firstName);

  // Generate auth token
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Safe user response
  const safeUser = user.toJSON();

  return { token, user: safeUser };
};



// ✅ Login User
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("Account has been deactivated. Please contact support.");
  }

  if (!user.emailVerified) {
    throw new Error("Please verify your email first. Check your inbox for verification link.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const safeUser = user.toJSON();

  return { token, user: safeUser };
};



// ✅ Get user profile
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select(
    "firstName lastName email phoneNumber dateOfBirth nationality role preferredLanguage companyName businessLicense isActive emailVerified createdAt updatedAt"
  );

  if (!user) throw new Error("User not found");

  const data = user.toObject();
  data.name = `${data.firstName} ${data.lastName}`;
  return data;
};



// ✅ Update user profile
export const updateUserProfile = async (userId, updateData) => {
  const allowedFields = [
    "firstName", "lastName", "phoneNumber", "nationality",
    "preferredLanguage", "companyName", "businessLicense"
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

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: filteredData },
    { new: true, runValidators: true }
  ).select(
    "firstName lastName email phoneNumber dateOfBirth nationality role preferredLanguage companyName businessLicense isActive emailVerified createdAt updatedAt"
  );

  if (!updatedUser) throw new Error("User not found");

  const data = updatedUser.toObject();
  data.name = `${data.firstName} ${data.lastName}`;
  return data;
};
