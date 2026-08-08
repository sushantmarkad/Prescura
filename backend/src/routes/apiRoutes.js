const express = require('express');
const router = express.Router();
const { processPrescription } = require('../controllers/extractController');
const { finalizeAudit, getStats, exportAudits } = require('../controllers/auditController');

// Define API routes
router.post('/process', processPrescription);
router.post('/audit/finalize', finalizeAudit);
router.get('/stats', getStats);
router.get('/export', exportAudits);

module.exports = router;
