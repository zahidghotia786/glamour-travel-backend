import bcrypt from 'bcryptjs';
import emailService from '../emails/email.service.js';
import prisma from '../../config/db.js';

class B2BService {
  // Generate strong password
  generateStrongPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Validate B2B user data
  validateB2BUserData(userData) {
    const { firstName, lastName, email, phoneNumber, companyName, markupType, markupValue } = userData;
    
    if (!firstName || !lastName || !email || !phoneNumber || !companyName) {
      throw new Error('First name, last name, email, phone number, and company name are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate markup data
    if (!markupType || markupValue === undefined || markupValue === null) {
      throw new Error('Markup type and value are required');
    }

    if (markupType !== 'percentage' && markupType !== 'fixed') {
      throw new Error('Markup type must be either "percentage" or "fixed"');
    }

    if (markupValue < 0) {
      throw new Error('Markup value cannot be negative');
    }

    return true;
  }

  // Create B2B user
  async createB2BUser(userData) {
    try {
      // Validate input
      this.validateB2BUserData(userData);

      const { 
        firstName, 
        lastName, 
        email, 
        phoneNumber, 
        companyName, 
        businessLicense, 
        accountManagerId,
        markupType,
        markupValue
      } = userData;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate account manager if provided
      let validatedAccountManagerId = null;
      if (accountManagerId && accountManagerId.trim() !== '') {
        try {
          const accountManager = await prisma.user.findUnique({
            where: { id: accountManagerId }
          });
          
          if (!accountManager || !['ADMIN', 'ACCOUNT_MANAGER'].includes(accountManager.role)) {
            console.warn('Invalid account manager ID provided, setting to null');
          } else {
            validatedAccountManagerId = accountManagerId;
          }
        } catch (error) {
          console.warn('Error validating account manager, setting to null:', error.message);
        }
      }

      // Generate strong temporary password
      const tempPassword = this.generateStrongPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Create B2B user with markup fields
      const newUser = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          phoneNumber,
          password: hashedPassword,
          role: 'B2B',
          companyName,
          businessLicense: businessLicense || null,
          markupType,
          markupValue: parseFloat(markupValue),
          accountManagerId: validatedAccountManagerId,
          isActive: true,
          emailVerified: true,
          nationality: 'UAE',
          preferredLanguage: 'en'
        },
        include: {
          accountManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Send welcome email with login credentials
      const emailResult = await emailService.sendB2BWelcomeEmail(
        email, 
        firstName, 
        tempPassword,
        companyName,
        markupType,
        markupValue
      );

      if (!emailResult.success) {
        console.warn(`Welcome email failed to send to: ${email}`, emailResult.error);
      }

      return {
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          companyName: newUser.companyName,
          markupType: newUser.markupType,
          markupValue: newUser.markupValue,
          accountManager: newUser.accountManager
        },
        emailSent: emailResult.success
      };

    } catch (error) {
      console.error('B2B Service Error:', error);
      throw error;
    }
  }

  // Update B2B user
  async updateB2BUser(userId, userData) {
    try {
      const { 
        firstName, 
        lastName, 
        phoneNumber, 
        companyName, 
        businessLicense, 
        accountManagerId,
        markupType,
        markupValue
      } = userData;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId, role: 'B2B' }
      });

      if (!existingUser) {
        throw new Error('B2B user not found');
      }

      // Validate account manager if provided
      let validatedAccountManagerId = null;
      if (accountManagerId && accountManagerId.trim() !== '') {
        try {
          const accountManager = await prisma.user.findUnique({
            where: { id: accountManagerId }
          });
          
          if (!accountManager || !['ADMIN', 'ACCOUNT_MANAGER'].includes(accountManager.role)) {
            console.warn('Invalid account manager ID provided, setting to null');
          } else {
            validatedAccountManagerId = accountManagerId;
          }
        } catch (error) {
          console.warn('Error validating account manager, setting to null:', error.message);
        }
      }

      // Update B2B user with markup fields
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          phoneNumber,
          companyName,
          businessLicense: businessLicense || null,
          // REMOVED: creditLimit
          markupType: markupType || existingUser.markupType,
          markupValue: markupValue !== undefined ? parseFloat(markupValue) : existingUser.markupValue,
          accountManagerId: validatedAccountManagerId
        },
        include: {
          accountManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      return {
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          companyName: updatedUser.companyName,
          markupType: updatedUser.markupType,
          markupValue: updatedUser.markupValue,
          accountManager: updatedUser.accountManager
        }
      };

    } catch (error) {
      console.error('B2B Service Update Error:', error);
      throw error;
    }
  }

  // Get all B2B users
  async getB2BUsers() {
    try {
      return await prisma.user.findMany({
        where: { role: 'B2B' },
        include: {
          accountManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching B2B users:', error);
      throw error;
    }
  }

  // Calculate B2B price with markup
  calculateB2BPrice(basePrice, markupType, markupValue) {
    if (markupType === 'percentage') {
      const markupAmount = (basePrice * markupValue) / 100;
      return {
        originalPrice: basePrice,
        markupType,
        markupValue,
        markupAmount,
        finalPrice: basePrice + markupAmount,
        currency: 'AED'
      };
    } else if (markupType === 'fixed') {
      return {
        originalPrice: basePrice,
        markupType,
        markupValue,
        markupAmount: markupValue,
        finalPrice: basePrice + markupValue,
        currency: 'AED'
      };
    }
    
    throw new Error('Invalid markup type');
  }
}

export default new B2BService();