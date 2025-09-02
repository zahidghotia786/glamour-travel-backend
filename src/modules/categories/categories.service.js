// backend/src/modules/categories/categories.service.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class CategoryService {
  async getAllActiveCategories() {
    try {
      return await prisma.category.findMany({
        where: { status: 'ACTIVE' },
        orderBy: [
          { displayOrder: 'asc' },
          { name: 'asc' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to fetch active categories: ${error.message}`);
    }
  }

  async getCategoryBySlug(slug) {
    try {
      return await prisma.category.findUnique({
        where: { slug },  // slug is unique
      });
    } catch (error) {
      throw new Error(`Failed to fetch category by slug: ${error.message}`);
    }
  }

  async validateCategoryExists(categoryId) {
    try {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) }
      });
      return !!category;
    } catch (error) {
      throw new Error(`Failed to validate category: ${error.message}`);
    }
  }

  async getCategoriesForDropdown() {
    try {
      return await prisma.category.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          icon: true
        },
        orderBy: [
          { displayOrder: 'asc' },
          { name: 'asc' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to fetch categories for dropdown: ${error.message}`);
    }
  }

  async searchCategories(searchTerm, limit = 10) {
    try {
      return await prisma.category.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        orderBy: { displayOrder: 'asc' },
        take: limit
      });
    } catch (error) {
      throw new Error(`Failed to search categories: ${error.message}`);
    }
  }
}

export default new CategoryService();  // ✅ ES Module export
