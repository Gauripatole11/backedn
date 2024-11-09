// routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminAuthController = require('../controllers/admin.auth.controller');

const { authenticateJWT, isAdmin } = require('../middleware/auth.middleware');

// Auth routes (no authentication needed)
router.post('/login', adminAuthController.login);
router.post('/register', adminAuthController.register);



// Apply authentication and admin check to all routes
router.use(authenticateJWT, isAdmin);

// Key Management Routes
router.get('/keys',
    adminController.getAllKeys
);

router.get('/keys/:keyId',
    adminController.getKeyDetails
);

router.post('/keys',
    adminController.registerKey
);

router.post('/keys/bulk',
    adminController.registerBulkKeys
);

router.post('/keys/assign',
    adminController.assignKey
);

router.post('/keys/revoke',
    adminController.revokeKey
);

// Dashboard & Reports Routes
router.get('/dashboard/stats',
    adminController.getDashboardStats
);

router.get('/reports/inventory',
    adminController.generateInventoryReport
);

// Audit Log Routes
router.get('/audit-logs',
    adminController.getAuditLogs
);

router.get('/audit-logs/export',
    adminController.exportAuditLogs
);

module.exports = router;