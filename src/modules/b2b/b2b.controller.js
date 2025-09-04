import prisma from "../../config/db.js";
import b2bService from "./b2b.service.js";

class B2BController {
  async createB2BUser(req, res) {
    try {
      const {
        firstName,
        lastName,
        email,
        phoneNumber,
        companyName,
        businessLicense,
        accountManagerId,
        markupType,
        markupValue
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !phoneNumber || !companyName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate markup data
      if (!markupType || markupValue === undefined || markupValue === null) {
        return res.status(400).json({ error: 'Markup type and value are required' });
      }

      if (markupType !== 'percentage' && markupType !== 'fixed') {
        return res.status(400).json({ error: 'Markup type must be either "percentage" or "fixed"' });
      }

      if (markupValue < 0) {
        return res.status(400).json({ error: 'Markup value cannot be negative' });
      }

      const result = await b2bService.createB2BUser({
        firstName,
        lastName,
        email,
        phoneNumber,
        companyName,
        businessLicense,
        accountManagerId,
        markupType,
        markupValue
      });
      
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

  async updateB2BUser(req, res) {
    try {
      const userId = req.params.id;
      const {
        firstName,
        lastName,
        phoneNumber,
        companyName,
        businessLicense,
        accountManagerId,
        markupType,
        markupValue
      } = req.body;

      // Validate markup data if provided
      if (markupType && markupType !== 'percentage' && markupType !== 'fixed') {
        return res.status(400).json({ error: 'Markup type must be either "percentage" or "fixed"' });
      }

      if (markupValue !== undefined && markupValue !== null && markupValue < 0) {
        return res.status(400).json({ error: 'Markup value cannot be negative' });
      }

      const result = await b2bService.updateB2BUser(userId, {
        firstName,
        lastName,
        phoneNumber,
        companyName,
        businessLicense,
        accountManagerId,
        markupType,
        markupValue
      });
      
      res.status(200).json({
        message: 'B2B user updated successfully',
        ...result
      });
    } catch (error) {
      console.error('Update B2B user error:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('Invalid')) {
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