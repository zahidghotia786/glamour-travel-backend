import prisma from "../../config/db.js";
import slugify from "slugify";

export async function list(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { images: true, category: true },
    });
    res.json(products);
  } catch (e) { next(e); }
}

export async function getById(req, res, next) {
  try {
    const p = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { images: true, category: true },
    });
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const { name, type, shortDesc, longDesc, baseCurrency, basePrice, isActive, images = [], categoryId  } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (exists) return res.status(409).json({ message: "Product with same name/slug exists" });

    const created = await prisma.product.create({
      data: {
        name, slug, type, shortDesc, longDesc,
        baseCurrency, basePrice,
        isActive: isActive ?? true,
        createdById: req.user?.id || null,
        categoryId: categoryId || null,
        images: { create: images.map(i => ({ url: i.url, alt: i.alt || "" })) },
      },
      include: { images: true, category: true },
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const { name, type, shortDesc, longDesc, baseCurrency, basePrice, isActive, images = [], categoryId  } = req.body;

        // Validate category exists if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });
      if (!category) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
    }

    // Replace images (simple strategy)
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new Error("Not found");

      const data = { name, type, shortDesc, longDesc, baseCurrency, basePrice, isActive 
        ,categoryId: categoryId || null
      };
      if (name && name !== existing.name) data["slug"] = slugify(name, { lower: true, strict: true });

      await tx.productImage.deleteMany({ where: { productId: req.params.id } });
      return tx.product.update({
        where: { id: req.params.id },
        data: {
          ...data,
          images: { create: images.map(i => ({ url: i.url, alt: i.alt || "" })) },
        },
        include: { images: true, category: true },
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




// Public functions
export async function getProductsPublic(req, res) {
  try {
    const { category, isActive, minPrice, maxPrice, search } = req.query;
    
    const where = {
      isActive: true // Only show active products to public
    };
    
    if (category) {
      where.categoryId = category;
    }
    
    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) where.basePrice.gte = parseFloat(minPrice);
      if (maxPrice) where.basePrice.lte = parseFloat(maxPrice);
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { shortDesc: { contains: search, mode: 'insensitive' } },
        { longDesc: { contains: search, mode: 'insensitive' } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProductsByCategory(req, res) {
  try {
    const { categoryId } = req.params;
    
    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const products = await prisma.product.findMany({
      where: { 
        categoryId,
        isActive: true 
      },
      include: {
        category: true,
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      category,
      products
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getFeaturedProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      where: { 
        isActive: true 
      },
      include: {
        category: true,
        images: true
      },
      orderBy: { createdAt: 'desc' },
      take: 12 // Limit to 12 featured products
    });

    res.status(200).json(products);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProductById(req, res) {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { 
        id,
        isActive: true // Only return active products to public
      },
      include: {
        category: true,
        images: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
