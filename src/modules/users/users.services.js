
import prisma from '../../config/db.js';

class UserService {
  // Get user profile
  async getProfile(userId) {
    try {
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
          companyName: true,
          preferredLanguage: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('User Service - Get Profile Error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, userData) {
    try {
      const { firstName, lastName, phoneNumber, dateOfBirth, nationality, preferredLanguage, metadata  } = userData;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phoneNumber && { phoneNumber }),
          ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
          ...(nationality && { nationality }),
          ...(preferredLanguage && { preferredLanguage }),
          ...(metadata && { metadata })
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          dateOfBirth: true,
          nationality: true,
          role: true,
          companyName: true,
          preferredLanguage: true,
          metadata: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return updatedUser;
    } catch (error) {
      console.error('User Service - Update Profile Error:', error);
      throw error;
    }
  }

  // Update admin profile (specific to admin users)
  async updateAdminProfile(userId, adminData) {
    try {
      const { adminName, adminEmail, adminPhone, adminPosition } = adminData;
      
      // Split adminName into firstName and lastName
      const nameParts = adminName ? adminName.split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const updatedUser = await prisma.user.update({
        where: { 
          id: userId,
          role: 'ADMIN' // Only allow for admin users
        },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(adminEmail && { email: adminEmail }),
          ...(adminPhone && { phoneNumber: adminPhone }),
          // Store position in a metadata field or use a separate field
          metadata: {
            position: adminPosition
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          role: true,
          metadata: true
        }
      });

      return updatedUser;
    } catch (error) {
      console.error('User Service - Update Admin Profile Error:', error);
      throw error;
    }
  }

  // Get user bookings
  async getUserBookings(userId, filters = {}) {
    try {
      const { status, startDate, endDate, page = 1, limit = 10 } = filters;
      
      const skip = (page - 1) * limit;
      
      const where = {
        userId,
        ...(status && { status }),
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate) } })
      };

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            },
            b2bAccount: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.booking.count({ where })
      ]);

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
      console.error('User Service - Get Bookings Error:', error);
      throw error;
    }
  }

  // Get admin settings (for admin users)
  async getAdminSettings() {
    try {
      // In a real application, you might store these in a separate settings table
      // For now, we'll return default settings
      const defaultSettings = {
        defaultB2BDiscount: 15,
        b2bCreditLimit: 50000,
        b2bAutoApprove: true,
        b2bRequireBusinessLicense: true,
        b2bWelcomeEmail: true
      };

      // Check if settings exist in database or return defaults
      const settings = await prisma.settings.findFirst({
        where: { type: 'ADMIN_SETTINGS' }
      });

      return settings ? settings.value : defaultSettings;
    } catch (error) {
      console.error('User Service - Get Admin Settings Error:', error);
      throw error;
    }
  }

  // Update admin settings
  async updateAdminSettings(settingsData) {
    try {
      const { defaultB2BDiscount, b2bCreditLimit, b2bAutoApprove, b2bRequireBusinessLicense, b2bWelcomeEmail } = settingsData;

      const settings = await prisma.settings.upsert({
        where: { type: 'ADMIN_SETTINGS' },
        update: {
          value: {
            defaultB2BDiscount: parseInt(defaultB2BDiscount) || 15,
            b2bCreditLimit: parseInt(b2bCreditLimit) || 50000,
            b2bAutoApprove: Boolean(b2bAutoApprove),
            b2bRequireBusinessLicense: Boolean(b2bRequireBusinessLicense),
            b2bWelcomeEmail: Boolean(b2bWelcomeEmail)
          }
        },
        create: {
          type: 'ADMIN_SETTINGS',
          value: {
            defaultB2BDiscount: parseInt(defaultB2BDiscount) || 15,
            b2bCreditLimit: parseInt(b2bCreditLimit) || 50000,
            b2bAutoApprove: Boolean(b2bAutoApprove),
            b2bRequireBusinessLicense: Boolean(b2bRequireBusinessLicense),
            b2bWelcomeEmail: Boolean(b2bWelcomeEmail)
          }
        }
      });

      return settings.value;
    } catch (error) {
      console.error('User Service - Update Admin Settings Error:', error);
      throw error;
    }
  }
}

export default new UserService();