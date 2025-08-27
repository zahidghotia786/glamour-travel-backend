import prisma from "../../config/db.js";

export async function adminList(req, res, next) {
  try {
    const { q, status, paymentStatus } = req.query;
    const where = {};
    if (status) where["status"] = status;
    if (paymentStatus) where["paymentStatus"] = paymentStatus;
    if (q) {
      where["OR"] = [
        { reference: { contains: q, mode: "insensitive" } },
        { supplierRef: { contains: q, mode: "insensitive" } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        b2bAccount: { select: { id: true, name: true, code: true } },
        items: true,
      },
    });
    res.json(bookings);
  } catch (e) { next(e); }
}

export async function adminCancel(req, res, next) {
  try {
    const id = req.params.id;
    // TODO: if supplier booking, call supplier cancel API here.
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    res.json(updated);
  } catch (e) { next(e); }
}
