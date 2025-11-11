const express = require('express');
const router = express.Router();
const {
  getAllBarbers,
  createBarber,
  updateBarber,
  deleteBarber,
  getAllServices,
  createService,
  updateService,
  deleteService,
  getAvailabilitySettings,
  updateAvailabilitySettings,
  getBarberAvailability,
  updateBarberAvailability
} = require('../controllers/configController');
const { protect, adminOnly } = require('../middleware/auth');

// All routes require admin access
router.use(protect, adminOnly);

// Barber routes
router.get('/barbers', getAllBarbers);
router.post('/barbers', createBarber);
router.put('/barbers/:id', updateBarber);
router.delete('/barbers/:id', deleteBarber);

// Service routes
router.get('/services', getAllServices);
router.post('/services', createService);
router.put('/services/:id', updateService);
router.delete('/services/:id', deleteService);

// Availability settings routes
router.get('/availability/settings', getAvailabilitySettings);
router.put('/availability/settings', updateAvailabilitySettings);

// Barber availability routes
router.get('/availability/barbers', getBarberAvailability);
router.put('/availability/barbers', updateBarberAvailability);

module.exports = router;
