import User from "../../models/users/model.js";
import Booking from "../../models/booking.model.js"; 
import Settings from "../../models/settings.model.js"; 

class UserService {
  // Get user profile
  async getProfile(userId) {
    try {
      const user = await User.findById(userId)
        .select("firstName lastName email phoneNumber dateOfBirth nationality role companyName preferredLanguage createdAt updatedAt")
        .lean();

      if (!user) throw new Error("User not found");

      return user;
    } catch (error) {
      console.error("User Service - Get Profile Error:", error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, userData) {
    try {
      const updateData = {};
      const fields = ["firstName", "lastName", "phoneNumber", "dateOfBirth", "nationality", "preferredLanguage", "metadata"];
      fields.forEach(field => {
        if (userData[field] !== undefined) updateData[field] = userData[field];
      });

      if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true })
        .select("firstName lastName email phoneNumber dateOfBirth nationality role companyName preferredLanguage metadata createdAt updatedAt")
        .lean();

      return updatedUser;
    } catch (error) {
      console.error("User Service - Update Profile Error:", error);
      throw error;
    }
  }

  // Update admin profile (only for ADMIN users)
  async updateAdminProfile(userId, adminData) {
    try {
      const { adminName, adminEmail, adminPhone, adminPosition } = adminData;

      const nameParts = adminName ? adminName.split(" ") : [];
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, role: "ADMIN" },
        {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(adminEmail && { email: adminEmail }),
          ...(adminPhone && { phoneNumber: adminPhone }),
          ...(adminPosition && { metadata: { position: adminPosition } })
        },
        { new: true }
      ).select("firstName lastName email phoneNumber role metadata").lean();

      return updatedUser;
    } catch (error) {
      console.error("User Service - Update Admin Profile Error:", error);
      throw error;
    }
  }

  // Get user bookings with filters and pagination
  async getUserBookings(userId, filters = {}) {
    try {
      const { status, startDate, endDate, page = 1, limit = 10 } = filters;
      const query = { userId };

      if (status) query.status = status;
      if (startDate || endDate) query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);

      const bookings = await Booking.find(query)
        .populate({
          path: "items.product",
          select: "id name type"
        })
        .populate({
          path: "b2bAccount",
          select: "id name code"
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Booking.countDocuments(query);

      return {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error("User Service - Get Bookings Error:", error);
      throw error;
    }
  }

  // Get admin settings
  async getAdminSettings() {
    try {
      const settingsDoc = await Settings.findOne({ type: "ADMIN_SETTINGS" }).lean();

      const defaultSettings = {
        defaultB2BDiscount: 15,
        b2bCreditLimit: 50000,
        b2bAutoApprove: true,
        b2bRequireBusinessLicense: true,
        b2bWelcomeEmail: true
      };

      return settingsDoc?.value || defaultSettings;
    } catch (error) {
      console.error("User Service - Get Admin Settings Error:", error);
      throw error;
    }
  }

  // Update admin settings
  async updateAdminSettings(settingsData) {
    try {
      const updateValue = {
        defaultB2BDiscount: parseInt(settingsData.defaultB2BDiscount) || 15,
        b2bCreditLimit: parseInt(settingsData.b2bCreditLimit) || 50000,
        b2bAutoApprove: Boolean(settingsData.b2bAutoApprove),
        b2bRequireBusinessLicense: Boolean(settingsData.b2bRequireBusinessLicense),
        b2bWelcomeEmail: Boolean(settingsData.b2bWelcomeEmail)
      };

      const settings = await Settings.findOneAndUpdate(
        { type: "ADMIN_SETTINGS" },
        { value: updateValue },
        { upsert: true, new: true }
      ).lean();

      return settings.value;
    } catch (error) {
      console.error("User Service - Update Admin Settings Error:", error);
      throw error;
    }
  }
}

export default new UserService();
