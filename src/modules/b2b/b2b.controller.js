import prisma from "../../config/db.js";

export async function listMarkups(req, res, next) {
  try {
    const rules = await prisma.markupRule.findMany({
      where: { isActive: true },
      include: {
        b2bAccount: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(rules);
  } catch (e) { next(e); }
}

export async function createOrUpdateMarkup(req, res, next) {
  try {
    const { id, b2bAccountId, productId, percentage } = req.body;
    if (percentage == null) return res.status(400).json({ message: "percentage is required" });

    let rule;
    if (id) {
      rule = await prisma.markupRule.update({
        where: { id },
        data: { b2bAccountId: b2bAccountId || null, productId: productId || null, percentage, isActive: true },
      });
    } else {
      rule = await prisma.markupRule.create({
        data: { b2bAccountId: b2bAccountId || null, productId: productId || null, percentage, isActive: true },
      });
    }
    res.json(rule);
  } catch (e) { next(e); }
}

export async function deleteMarkup(req, res, next) {
  try {
    await prisma.markupRule.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}
