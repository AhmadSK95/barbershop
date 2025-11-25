const express = require('express');
const router = express.Router();
const { getAuditLogs, getAuditStats } = require('../controllers/auditController');
const { protect, adminOnly } = require('../middleware/auth');

// All routes require admin access
router.use(protect, adminOnly);

router.get('/logs', getAuditLogs);
router.get('/stats', getAuditStats);

module.exports = router;
