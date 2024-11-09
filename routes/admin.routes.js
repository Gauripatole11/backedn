// routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminAuthController = require('../controllers/admin.auth.controller');
const { authenticateJWT, isAdmin } = require('../middleware/auth.middleware');

// Auth routes (no authentication needed)
router.post('/login', adminAuthController.login);

// Apply authentication and admin check to all routes
router.use(authenticateJWT, isAdmin);

// Key Management Routes
router.get('/keys',
    adminController.getAllKeys
);


router.post('/keys/assign',
    adminController.assignKey
);

router.post('/keys/revoke',
    adminController.revokeKey
);

module.exports = router;