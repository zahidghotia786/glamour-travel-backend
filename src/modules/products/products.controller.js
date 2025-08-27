import prisma from "../../config/db.js";
import slugify from "slugify";

export async function list(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { images: true },
    });
    res.json(products);
  } catch (e) { next(e); }
}

export async function getById(req, res, next) {
  try {
    const p = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { images: true },
    });
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const { name, type, shortDesc, longDesc, baseCurrency, basePrice, isActive, images = [] } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (exists) return res.status(409).json({ message: "Product with same name/slug exists" });

    const created = await prisma.product.create({
      data: {
        name, slug, type, shortDesc, longDesc,
        baseCurrency, basePrice,
        isActive: isActive ?? true,
        createdById: req.user?.id || null,
        images: { create: images.map(i => ({ url: i.url, alt: i.alt || "" })) },
      },
      include: { images: true },
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const { name, type, shortDesc, longDesc, baseCurrency, basePrice, isActive, images = [] } = req.body;

    // Replace images (simple strategy)
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new Error("Not found");

      const data = { name, type, shortDesc, longDesc, baseCurrency, basePrice, isActive };
      if (name && name !== existing.name) data["slug"] = slugify(name, { lower: true, strict: true });

      await tx.productImage.deleteMany({ where: { productId: req.params.id } });
      return tx.product.update({
        where: { id: req.params.id },
        data: {
          ...data,
          images: { create: images.map(i => ({ url: i.url, alt: i.alt || "" })) },
        },
        include: { images: true },
      });
    });

    res.json(updated);
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}
