// controllers/admin.auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const auditService = require('../services/audit.service');
const { verifyMFAToken } = require('../utils/mfa');

const adminAuthController = {

    // Admin Login
    async login(req, res) {
        try {
            let { email, password, mfaCode } = req.body
            // Find admin user
            const admin = await User.findOne({
                email: email,
                role: { $in: ['admin'] }
            });

            if (!admin) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Invalid credentials'
                });
            }

            // Check password
            const isPasswordValid = await bcrypt.compare(password, admin.password);
            if (!isPasswordValid) {
                await auditService.createAuditLog({
                    action: 'ADMIN_LOGIN_FAILED',
                    performedBy: admin._id,
                    details: {
                        reason: 'Invalid password',
                        ip: req.ip
                    }
                });

                return res.status(404).json({
                    status: 'error',
                    message: 'Invalid credentials'
                });
            }

            if (admin.mfaEnabled) {
                // Verify MFA token
                const isMFAValid = verifyMFAToken(admin.mfaSecret, mfaCode);
                if (!isMFAValid) {
                    await auditService.createAuditLog({
                        action: 'ADMIN_LOGIN_FAILED',
                        performedBy: admin._id,
                        details: {
                            reason: 'Invalid MFA code',
                            ip: req.ip
                        }
                    });

                    return res.status(404).json({
                        status: 'error',
                        message: 'Invalid MFA code'
                    });
                }
            }


            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: admin._id,
                    role: admin.role
                },
                process.env.JWT_SECRET,
                { expiresIn: '4h' } // Shorter session for admin
            );

            // Update last login
            admin.lastLogin = new Date();
            await admin.save();

            // Create audit log
            await auditService.createAuditLog({
                action: 'ADMIN_LOGIN_SUCCESS',
                performedBy: admin._id,
                details: {
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });

            res.json({
                status: 'success',
                data: {
                    token,
                    admin: {
                        id: admin._id,
                        email: admin.email,
                        firstName: admin.firstName,
                        lastName: admin.lastName,
                        role: admin.role,
                        adminId: admin.adminId
                    }
                }
            });

        } catch (error) {
            console.error('Admin login error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Error during login'
            });
        }
    },
};

module.exports = adminAuthController;