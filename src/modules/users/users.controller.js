import usersServices from "./users.services.js";

class UserController {
  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const profile = await usersServices.getProfile(userId);
      
      res.status(200).json(profile);
    } catch (error) {
      console.error('Get Profile Error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const userData = req.body;
      
      const updatedProfile = await usersServices.updateProfile(userId, userData);
      
      res.status(200).json({
        message: 'Profile updated successfully',
        user: updatedProfile
      });
    } catch (error) {
      console.error('Update Profile Error:', error);
      
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update admin profile
  async updateAdminProfile(req, res) {
    try {
      const userId = req.user.id;
      const adminData = req.body;
      
      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. Admin required.' });
      }
      
      const updatedProfile = await usersServices.updateAdminProfile(userId, adminData);
      
      res.status(200).json({
        message: 'Admin profile updated successfully',
        user: updatedProfile
      });
    } catch (error) {
      console.error('Update Admin Profile Error:', error);
      
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get user bookings
  async getUserBookings(req, res) {
    try {
      const userId = req.user.id;
      const filters = {
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };
      
      const bookings = await usersServices.getUserBookings(userId, filters);
      
      res.status(200).json(bookings);
    } catch (error) {
      console.error('Get User Bookings Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get admin settings
  async getAdminSettings(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. Admin required.' });
      }
      
      const settings = await usersServices.getAdminSettings();
      
      res.status(200).json(settings);
    } catch (error) {
      console.error('Get Admin Settings Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update admin settings
  async updateAdminSettings(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. Admin required.' });
      }
      
      const settingsData = req.body;
      const updatedSettings = await usersServices.updateAdminSettings(settingsData);
      
      res.status(200).json({
        message: 'Admin settings updated successfully',
        settings: updatedSettings
      });
    } catch (error) {
      console.error('Update Admin Settings Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default new UserController();