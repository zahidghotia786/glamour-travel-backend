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
    const { firstName, lastName, email, phoneNumber, companyName } = userData;
    
    if (!firstName || !lastName || !email || !phoneNumber || !companyName) {
      throw new Error('First name, last name, email, phone number, and company name are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
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
        creditLimit,
        accountManagerId,
        b2bDiscountRate
      } = userData;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

            // GET DEFAULT FROM ADMIN SETTINGS INSTEAD OF HARCODED VALUE
      const adminSettings = await prisma.settings.findUnique({
        where: { type: 'B2B_SETTINGS' }
      });

       const defaultDiscount = adminSettings?.value?.defaultB2BDiscount || 15;

      // Validate account manager if provided
      if (accountManagerId && accountManagerId.trim() !== '') {
        try {
          const accountManager = await prisma.user.findUnique({
            where: { id: accountManagerId }
          });
          
          if (!accountManager || !['ADMIN', 'ACCOUNT_MANAGER'].includes(accountManager.role)) {
            console.warn('Invalid account manager ID provided, setting to null');
            accountManagerId = null;
          }
        } catch (error) {
          console.warn('Error validating account manager, setting to null:', error.message);
          accountManagerId = null;
        }
      } else {
        accountManagerId = null;
      }

      // Generate strong temporary password
      const tempPassword = this.generateStrongPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Create B2B user - ADDED b2bDiscountRate field
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
          creditLimit: creditLimit ? parseInt(creditLimit) : 50000,
          b2bDiscountRate: parseFloat(b2bDiscountRate) || defaultDiscount,
          accountManagerId: accountManagerId || null,
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
        newUser.b2bDiscountRate
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
          creditLimit: newUser.creditLimit,
          b2bDiscountRate: newUser.b2bDiscountRate, // ADDED THIS LINE
          accountManager: newUser.accountManager
        },
        emailSent: emailResult.success
      };

    } catch (error) {
      console.error('B2B Service Error:', error);
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

  // ADDED: Calculate B2B price with discount
  calculateB2BPrice(basePrice, discountRate) {
    const discountPercentage = discountRate || 15.0;
    const discountAmount = (basePrice * discountPercentage) / 100;
    return {
      originalPrice: basePrice,
      discountPercentage,
      discountAmount,
      finalPrice: basePrice - discountAmount,
      currency: 'AED'
    };
  }
}

export default new B2BService();