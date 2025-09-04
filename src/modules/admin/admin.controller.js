import prisma from "../../config/db.js";

export const getAdminSummary = async (req, res) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalB2B,
      totalB2C,
      activeUsers,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      todayBookings,
      totalRevenue,
      todayRevenue,
      activeProducts
    ] = await Promise.all([
      // User counts - CORRECT ORDER
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "B2B" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { isActive: true } }),
      
      // Booking counts - CORRECT ORDER
      prisma.booking.count().catch(() => 0),
      prisma.booking.count({ 
        where: { status: "PENDING" } 
      }).catch(() => 0),
      prisma.booking.count({ 
        where: { status: "CONFIRMED" } 
      }).catch(() => 0),
      
      // Today's bookings
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }).catch(() => 0),
      
      // Revenue calculations - CORRECT ORDER
      prisma.booking
        .aggregate({
          _sum: { totalGross: true },
          where: { paymentStatus: "PAID" },
        })
        .then((result) => result._sum.totalGross || 0)
        .catch(() => 0),
      prisma.booking
        .aggregate({
          _sum: { totalGross: true },
          where: { 
            paymentStatus: "PAID",
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999))
            }
          },
        })
        .then((result) => result._sum.totalGross || 0)
        .catch(() => 0),
      
      // Product counts - CORRECT ORDER
      prisma.product.count({ 
        where: { isActive: true } 
      }).catch(() => 0),
    ]);

    // Get recent bookings (last 10)
    const recentBookings = await prisma.booking
      .findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { 
              id: true,
              firstName: true, 
              lastName: true, 
              email: true,
              phoneNumber: true 
            },
          },
          b2bAccount: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          items: {
            select: { 
              name: true, 
              quantity: true,
              unitGross: true,
              subtotalGross: true 
            },
          },
        },
      })
      .catch(() => []);

    // Get top products by booking count (top 10)
    const topProducts = await prisma.bookingItem
      .groupBy({
        by: ["name"],
        _count: { name: true },
        _sum: { 
          quantity: true,
          subtotalGross: true 
        },
        orderBy: { _count: { name: "desc" } },
        take: 10,
      })
      .catch(() => []);

    // Get booking trends for last 7 days - FIXED GROUP BY
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const bookingTrends = await prisma.booking
      .groupBy({
        by: ['createdAt'],
        _count: { id: true },
        _sum: { totalGross: true },
        where: {
          createdAt: {
            gte: sevenDaysAgo
          },
          paymentStatus: "PAID"
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
      .catch(() => []);

    // Get user registration trends for last 7 days - FIXED GROUP BY
    const userRegistrationTrends = await prisma.user
      .groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
      .catch(() => []);

    // Calculate additional metrics
    const totalProducts = await prisma.product.count().catch(() => 0);
    const cancelledBookings = await prisma.booking.count({
      where: { status: "CANCELLED" }
    }).catch(() => 0);

    res.json({
      totals: {
        users: totalUsers,
        admins: totalAdmins,
        b2b: totalB2B,
        customers: totalB2C,
        activeUsers: activeUsers,
        bookings: totalBookings,
        pendingBookings: pendingBookings,
        confirmedBookings: confirmedBookings,
        cancelledBookings: cancelledBookings,
        todayBookings: todayBookings,
        revenue: totalRevenue,
        todayRevenue: todayRevenue,
        activeProducts: activeProducts,
        totalProducts: totalProducts
      },
      trends: {
        bookingTrends: bookingTrends.map(item => ({
          date: item.createdAt,
          count: item._count.id,
          revenue: item._sum.totalGross || 0
        })),
        userRegistrationTrends: userRegistrationTrends.map(item => ({
          date: item.createdAt,
          count: item._count.id
        }))
      },
      latestBookings: recentBookings.map((booking) => ({
        id: booking.id,
        reference: booking.reference,
        customer: booking.user
          ? `${booking.user.firstName} ${booking.user.lastName}`
          : "Guest",
        email: booking.user?.email || "",
        phone: booking.user?.phoneNumber || "",
        b2bAccount: booking.b2bAccount ? {
          id: booking.b2bAccount.id,
          name: booking.b2bAccount.name,
          code: booking.b2bAccount.code
        } : null,
        total: booking.totalGross,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        items: booking.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitGross,
          subtotal: item.subtotalGross
        })),
        createdAt: booking.createdAt,
      })),
      topProducts: topProducts.map((product) => ({
        name: product.name,
        bookings: product._count.name,
        totalQuantity: product._sum.quantity || 0,
        totalRevenue: product._sum.subtotalGross || 0,
        averageOrderValue: product._count.name > 0 ? (product._sum.subtotalGross / product._count.name).toFixed(2) : 0
      })),
      performanceMetrics: {
        conversionRate: totalBookings > 0 ? (confirmedBookings / totalBookings * 100).toFixed(2) : 0,
        cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings * 100).toFixed(2) : 0,
        averageOrderValue: totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : 0,
        dailyAverageRevenue: totalRevenue > 0 ? (totalRevenue / 30).toFixed(2) : 0,
        userEngagementRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0,
        productUtilizationRate: totalProducts > 0 ? ((activeProducts / totalProducts) * 100).toFixed(2) : 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Admin summary error:", err);
    res.status(500).json({ 
      error: "Failed to fetch admin summary",
      details: err.message 
    });
  }
};

export const allUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', status = '', manager = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter conditions
    const where = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role && role !== 'all') {
      where.role = role.toUpperCase();
    }
    
    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    // Add account manager filter
    if (manager && manager !== 'all') {
      if (manager === 'assigned') {
        where.accountManagerId = { not: null };
      } else if (manager === 'unassigned') {
        where.accountManagerId = null;
      } else {
        where.accountManagerId = manager;
      }
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
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
          companyName: true,
          nationality: true,
          emailVerified: true,
          accountManagerId: true,
          accountManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              bookings: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    // Get booking stats for each user
    const userIds = users.map(user => user.id);
    const bookingStats = await prisma.booking.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        paymentStatus: 'PAID'
      },
      _sum: { totalGross: true },
      _count: { id: true }
    }).catch(() => []);

    const bookingStatsMap = Object.fromEntries(
      bookingStats.map(stat => [stat.userId, stat])
    );
    
    const transformedUsers = users.map(user => {
      const userBookingStats = bookingStatsMap[user.id] || { _sum: { totalGross: 0 }, _count: { id: 0 } };
      
      return {
        id: user.id,
        name: user.companyName || `${user.firstName} ${user.lastName}`,
        contactPerson: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phoneNumber || '',
        role: user.role,
        status: user.isActive ? 'active' : 'inactive',
        country: user.nationality || '',
        registeredDate: user.createdAt.toISOString().split('T')[0],
        lastLogin: user.updatedAt.toISOString().split('T')[0],
        totalBookings: user._count.bookings,
        totalRevenue: userBookingStats._sum.totalGross || 0,
        commission: calculateCommission(user.role),
        apiAccess: user.role === 'ADMIN' || user.role === 'B2B',
        creditLimit: calculateCreditLimit(user.role),
        emailVerified: user.emailVerified,
        accountManager: user.accountManager ? 
          `${user.accountManager.firstName} ${user.accountManager.lastName}` : 
          (user.role === 'B2B' ? 'Not Assigned' : ''),
        accountManagerId: user.accountManagerId,
        accountManagerEmail: user.accountManager?.email || ''
      };
    });

    res.json({
      users: transformedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('All users error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: Boolean(isActive) },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
      },
    });

    res.json({
      message: `User ${isActive ? "activated" : "blocked"} successfully`,
      user,
    });
  } catch (err) {
    console.error("Update user status error:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ["CUSTOMER", "B2B", "ADMIN"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    res.json({
      message: "User role updated successfully",
      user,
    });
  } catch (err) {
    console.error("Update user role error:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user has bookings
    const bookingCount = await prisma.booking.count({
      where: { userId },
    });

    if (bookingCount > 0) {
      // Don't delete, just deactivate
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: { id: true, email: true },
      });

      return res.json({
        message: "User has bookings, account deactivated instead of deleted",
        user,
      });
    }

    // Safe to delete
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accountManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookings: {
          include: {
            items: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        b2bAccounts: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate user statistics
    const totalRevenue = user.bookings
      .filter((booking) => booking.paymentStatus === "PAID")
      .reduce((sum, booking) => sum + booking.totalGross, 0);

    const bookingsByStatus = user.bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        nationality: user.nationality,
        role: user.role,
        companyName: user.companyName,
        businessLicense: user.businessLicense,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Add account manager information here
        accountManager: user.accountManager ? {
          id: user.accountManager.id,
          name: `${user.accountManager.firstName} ${user.accountManager.lastName}`,
          email: user.accountManager.email
        } : null
      },
      statistics: {
        totalBookings: user.bookings.length,
        totalRevenue,
        bookingsByStatus,
        avgBookingValue:
          user.bookings.length > 0 ? totalRevenue / user.bookings.length : 0,
      },
      recentBookings: user.bookings.slice(0, 5).map((booking) => ({
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        total: booking.totalGross,
        currency: booking.currency,
        items: booking.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          date: item.date,
        })),
        createdAt: booking.createdAt,
      })),
      b2bAccounts: user.b2bAccounts,
    });
  } catch (err) {
    console.error("Get user details error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Helper functions
function calculateCommission(role) {
  const commissionMap = {
    ADMIN: 0,
    B2B: 15,
    CUSTOMER: 0,
  };
  return commissionMap[role] || 0;
}

function calculateCreditLimit(role) {
  const creditLimitMap = {
    ADMIN: 100000,
    B2B: 50000,
    CUSTOMER: 0,
  };
  return creditLimitMap[role] || 0;
}

// Add this to your admin.controller.js file
export const assignAccountManager = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountManagerId } = req.body;

    // Validate input
    if (!accountManagerId) {
      return res.status(400).json({ error: "Account manager ID is required" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if manager exists and is an ADMIN
    const manager = await prisma.user.findUnique({
      where: { id: accountManagerId },
    });

    if (!manager) {
      return res.status(404).json({ error: "Account manager not found" });
    }

    if (manager.role !== "ADMIN") {
      return res
        .status(400)
        .json({ error: "Account manager must be an ADMIN" });
    }

    // Update user with account manager
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        accountManagerId: accountManagerId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        accountManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      message: "Account manager assigned successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Assign account manager error:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: err.message });
  }
};



// Add this to your admin.controller.js
export const getUsersByManager = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check if manager exists
    const manager = await prisma.user.findUnique({
      where: { id: managerId }
    });

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: { accountManagerId: managerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          role: true,
          isActive: true,
          createdAt: true,
          companyName: true,
          nationality: true,
          _count: {
            select: {
              bookings: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where: { accountManagerId: managerId } })
    ]);

    // Get booking stats for each user
    const userIds = users.map(user => user.id);
    const bookingStats = await prisma.booking.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        paymentStatus: 'PAID'
      },
      _sum: { totalGross: true },
      _count: { id: true }
    }).catch(() => []);

    const bookingStatsMap = Object.fromEntries(
      bookingStats.map(stat => [stat.userId, stat])
    );
    
    const transformedUsers = users.map(user => {
      const userBookingStats = bookingStatsMap[user.id] || { _sum: { totalGross: 0 }, _count: { id: 0 } };
      
      return {
        id: user.id,
        name: user.companyName || `${user.firstName} ${user.lastName}`,
        contactPerson: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phoneNumber || '',
        role: user.role,
        status: user.isActive ? 'active' : 'inactive',
        country: user.nationality || '',
        registeredDate: user.createdAt.toISOString().split('T')[0],
        totalBookings: user._count.bookings,
        totalRevenue: userBookingStats._sum.totalGross || 0
      };
    });

    res.json({
      users: transformedUsers,
      manager: {
        id: manager.id,
        name: `${manager.firstName} ${manager.lastName}`,
        email: manager.email
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Get users by manager error:', err);
    res.status(500).json({ error: err.message });
  }
};



// update b2b user by admin 
