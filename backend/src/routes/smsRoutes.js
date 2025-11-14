const express = require('express');
const router = express.Router();
const { addSmsDnd } = require('../controllers/smsController');

// Public endpoint: users tap this link from SMS to opt out of reminders
router.get('/dnd', addSmsDnd);

module.exports = router;
