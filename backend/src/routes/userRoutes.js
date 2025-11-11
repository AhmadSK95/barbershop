const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  updateProfile,
  changePassword,
  getServices,
  getAddons,
  getBarbers
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

// Public routes
router.get('/services', getServices);
router.get('/addons', getAddons);
router.get('/barbers', getBarbers);

// Protected routes
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Admin routes
router.get('/', protect, adminOnly, getAllUsers);
router.get('/:id', protect, adminOnly, getUserById);
router.put('/:id/role', protect, adminOnly, updateUserRole);
router.delete('/:id', protect, adminOnly, deleteUser);

module.exports = router;
