const express = require('express');
const router = express.Router();
const { processPrescription } = require('../controllers/extractController');
const { finalizeAudit, getStats, exportAudits, getUserAudits } = require('../controllers/auditController');
const { registerUser } = require('../controllers/authController');
const { getAllUsers, deleteUser, toggleMaintenanceMode, getSystemSettings } = require('../controllers/adminController');

// Define API routes
router.post('/process', processPrescription);
router.post('/audit/finalize', finalizeAudit);
router.get('/stats', getStats);
router.get('/export', exportAudits);

// User Auth & Personal Data Routes
router.post('/auth/register', registerUser);
router.get('/user/audits/:uid', getUserAudits);

// Admin Routes (In production, these must be protected by a middleware verifying admin role)
router.get('/admin/users', getAllUsers);
router.delete('/admin/users/:uid', deleteUser);
router.post('/admin/maintenance', toggleMaintenanceMode);
router.get('/admin/settings', getSystemSettings);

module.exports = router;
