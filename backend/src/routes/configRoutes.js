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
const { upload, uploadBarberImage, deleteBarberImage } = require('../controllers/imageController');
const { protect, adminOnly } = require('../middleware/auth');
const { logConfigChange } = require('../middleware/auditLogger');

// All routes require admin access
router.use(protect, adminOnly);

// Barber routes
router.get('/barbers', getAllBarbers);
router.post('/barbers', logConfigChange('barber'), createBarber);
router.put('/barbers/:id', logConfigChange('barber'), updateBarber);
router.delete('/barbers/:id', logConfigChange('barber'), deleteBarber);

// Service routes
router.get('/services', getAllServices);
router.post('/services', logConfigChange('service'), createService);
router.put('/services/:id', logConfigChange('service'), updateService);
router.delete('/services/:id', logConfigChange('service'), deleteService);

// Availability settings routes
router.get('/availability/settings', getAvailabilitySettings);
router.put('/availability/settings', logConfigChange('settings'), updateAvailabilitySettings);

// Barber availability routes
router.get('/availability/barbers', getBarberAvailability);
router.put('/availability/barbers', updateBarberAvailability);

// Barber image routes
router.post('/barbers/:id/image', upload.single('image'), uploadBarberImage);
router.delete('/barbers/:id/image', deleteBarberImage);

module.exports = router;
