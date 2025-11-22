const express = require('express');
const multer = require('multer');
const { submitApplication } = require('../controllers/careersController');

const router = express.Router();

// Configure multer for file upload (store in memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOC, DOCX
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
    }
  }
});

// @route   POST /api/careers/apply
// @desc    Submit job application
// @access  Public
router.post('/apply', upload.single('resume'), submitApplication);

module.exports = router;
