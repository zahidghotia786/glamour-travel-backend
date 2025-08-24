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
