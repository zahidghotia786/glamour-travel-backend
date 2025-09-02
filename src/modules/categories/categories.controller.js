// backend/src/modules/categories/categories.controller.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class CategoryController {
  // Get all categories with pagination and search
  async getCategories(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        status = '', 
        sortBy = 'displayOrder',
        sortOrder = 'asc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (status) {
        where.status = status.toUpperCase();
      }

      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where,
          orderBy: { [sortBy]: sortOrder.toLowerCase() },
          skip,
          take: parseInt(limit),
          include: {
            _count: {
              select: { products: true }
            }
          }
        }),
        prisma.category.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          categories,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }

  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      
      const category = await prisma.category.findUnique({
        where: { id: parseInt(id) },
        include: {
          products: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          _count: {
            select: { products: true }
          }
        }
      });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category',
        error: error.message
      });
    }
  }

  async createCategory(req, res) {
    try {
      const { name, description, icon, status, displayOrder } = req.body;

      if (!name || !description) {
        return res.status(400).json({
          success: false,
          message: 'Name and description are required'
        });
      }

      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const existingCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { slug }
          ]
        }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      const category = await prisma.category.create({
        data: {
          name: name.trim(),
          description: description.trim(),
          slug,
          icon: icon || '📂',
          status: status ? status.toUpperCase() : 'ACTIVE',
          displayOrder: displayOrder || 0
        }
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create category',
        error: error.message
      });
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description, icon, status, displayOrder } = req.body;

      const existingCategory = await prisma.category.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      const updateData = {};
      
      if (name !== undefined) {
        const slug = name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
          
        const nameConflict = await prisma.category.findFirst({
          where: {
            OR: [
              { name: { equals: name, mode: 'insensitive' } },
              { slug }
            ],
            NOT: { id: parseInt(id) }
          }
        });

        if (nameConflict) {
          return res.status(400).json({
            success: false,
            message: 'Category with this name already exists'
          });
        }
        
        updateData.name = name.trim();
        updateData.slug = slug;
      }

      if (description !== undefined) updateData.description = description.trim();
      if (icon !== undefined) updateData.icon = icon;
      if (status !== undefined) updateData.status = status.toUpperCase();
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

      const category = await prisma.category.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category',
        error: error.message
      });
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: {
            select: { products: true }
          }
        }
      });
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      if (category._count.products > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category with ${category._count.products} associated products`
        });
      }

      await prisma.category.delete({
        where: { id: parseInt(id) }
      });

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: error.message
      });
    }
  }

  async updateDisplayOrder(req, res) {
    try {
      const { categories } = req.body;

      if (!Array.isArray(categories)) {
        return res.status(400).json({
          success: false,
          message: 'Categories must be an array'
        });
      }

      await prisma.$transaction(async (tx) => {
        for (const cat of categories) {
          await tx.category.update({
            where: { id: cat.id },
            data: { displayOrder: cat.displayOrder }
          });
        }
      });

      res.json({
        success: true,
        message: 'Display order updated successfully'
      });
    } catch (error) {
      console.error('Error updating display order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update display order',
        error: error.message
      });
    }
  }

  async getCategoryStats(req, res) {
    try {
      const [totalCategories, activeCategories, inactiveCategories] = await Promise.all([
        prisma.category.count(),
        prisma.category.count({ where: { status: 'ACTIVE' } }),
        prisma.category.count({ where: { status: 'INACTIVE' } })
      ]);

      res.json({
        success: true,
        data: {
          total: totalCategories,
          active: activeCategories,
          inactive: inactiveCategories
        }
      });
    } catch (error) {
      console.error('Error fetching category stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category statistics',
        error: error.message
      });
    }
  }
}

export default new CategoryController();  // <-- ES Module export
