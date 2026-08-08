const express = require('express');
const router = express.Router();
const { processPrescription } = require('../controllers/extractController');
const { finalizeAudit, getStats, exportAudits, getUserAudits, getAuditById } = require('../controllers/auditController');
const { registerUser } = require('../controllers/authController');
const { getAllUsers, deleteUser, toggleMaintenanceMode, getSystemSettings } = require('../controllers/adminController');

// Define API routes
router.post('/process', processPrescription);
router.post('/audit/finalize', finalizeAudit);
router.get('/stats', getStats);
router.get('/export', exportAudits);
router.get('/audit/:id', getAuditById);

// User Auth & Personal Data Routes
router.post('/auth/register', registerUser);
router.get('/user/audits/:uid', getUserAudits);

// Admin Routes (In production, these must be protected by a middleware verifying admin role)
router.get('/admin/users', getAllUsers);
router.delete('/admin/users/:uid', deleteUser);
router.post('/admin/maintenance', toggleMaintenanceMode);
router.get('/admin/settings', getSystemSettings);

// Debug Route
router.get('/debug-models', async (req, res) => {
  try {
    const fetch = require('node-fetch') || global.fetch;
    const key = process.env.AI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
