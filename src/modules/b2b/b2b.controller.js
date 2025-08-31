import prisma from "../../config/db.js";
import b2bService from "./b2b.service.js";

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


class B2BController {
  async createB2BUser(req, res) {
    try {
      const result = await b2bService.createB2BUser(req.body);
      
      res.status(201).json({
        message: 'B2B user created successfully',
        ...result
      });
    } catch (error) {
      console.error('Create B2B user error:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getB2BUsers(req, res) {
    try {
      const users = await b2bService.getB2BUsers();
      res.status(200).json({ users });
    } catch (error) {
      console.error('Get B2B users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default new B2BController();