import prisma from "../../config/db.js";

export const getAdminSummary = async (req, res) => {
  try {
    const [totalUsers, totalAdmins, totalB2B, totalB2C, totalBookings] =
      await Promise.all([
        prisma.user.count(), // all users
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.user.count({ where: { role: "B2B" } }),
        prisma.user.count({ where: { role: "CUSTOMER" } }),
        prisma.booking.count().catch(() => 0), // if bookings not ready yet
      ]);

    res.json({
      totals: {
        users: totalUsers,
        admins: totalAdmins,
        b2b: totalB2B,
        customers: totalB2C,
        bookings: totalBookings,
      },
      latestBookings: [], // fill later
      topProducts: [],    // fill later
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const allUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        companyName: true, // Add this if it exists in your schema
        // Add other fields you might need
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    
    // Transform the data to match the frontend expectations
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.companyName || `${user.firstName} ${user.lastName}`,
      contactPerson: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phoneNumber || '',
      role: mapRoleToPartnerType(user.role),
      status: user.isActive ? 'active' : 'inactive',
      country: '', // You might need to add a country field
      registeredDate: user.createdAt.toISOString().split('T')[0],
      lastLogin: user.updatedAt.toISOString().split('T')[0], // Using updatedAt as last login approximation
      totalBookings: 0, // You'll need to calculate this from bookings
      totalRevenue: 0, // You'll need to calculate this from bookings
      commission: calculateCommission(user.role),
      apiAccess: user.role === 'ADMIN' || user.role === 'PREMIUM', // Adjust based on your needs
      creditLimit: calculateCreditLimit(user.role),
      accountManager: '' // You might need to add this field
    }));
    res.json(transformedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Helper functions
function mapRoleToPartnerType(role) {
  const roleMap = {
    'ADMIN': 'premium-partner',
    'PREMIUM': 'premium-partner',
    'STANDARD': 'standard-partner',
    'BASIC': 'basic-partner',
    'USER': 'basic-partner'
  };
  return roleMap[role] || 'basic-partner';
}

function calculateCommission(role) {
  const commissionMap = {
    'ADMIN': 15,
    'PREMIUM': 15,
    'STANDARD': 12,
    'BASIC': 10,
    'USER': 10
  };
  return commissionMap[role] || 10;
}

function calculateCreditLimit(role) {
  const creditLimitMap = {
    'ADMIN': 50000,
    'PREMIUM': 50000,
    'STANDARD': 25000,
    'BASIC': 10000,
    'USER': 10000
  };
  return creditLimitMap[role] || 10000;
}

