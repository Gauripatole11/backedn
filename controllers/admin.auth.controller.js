// controllers/admin.auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { validate } = require('../utils/validators');
const { generateMFASecret, verifyMFAToken } = require('../utils/mfa');
const auditService = require('../services/audit.service');

const adminAuthController = {
    // Admin Registration
    async register(req, res) {
        try {
            // Validate request body
            const { errors, value } = validate.user.register(req.body);

            if (errors) {
                return res.status(400).json({
                    status: 'error',
                    errors
                });
            }

            // Check if admin already exists
            const existingAdmin = await User.findOne({
                $or: [
                    { email: value.email },
                    { adminId: value.adminId }
                ]
            });

            if (existingAdmin) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Admin with this email or ID already exists'
                });
            }

            // Generate MFA secret
            const mfaSecret = generateMFASecret();

            // Hash password
            const hashedPassword = await bcrypt.hash(value.password, 10);

            // Create admin user
            const admin = new User({
                ...value,
                password: hashedPassword,
                role: 'admin',
                mfaEnabled: true,
                mfaSecret
            });

            await admin.save();

            // Create audit log
            await auditService.createAuditLog({
                action: 'ADMIN_REGISTERED',
                performedBy: req.user?._id || admin._id,
                targetUserId: admin._id,
                details: {
                    email: admin.email,
                    adminId: admin.adminId
                }
            });

            // Return MFA secret for initial setup
            res.status(201).json({
                status: 'success',
                message: 'Admin registration pending approval',
                data: {
                    mfaSecret,
                    mfaQRCode: `otpauth://totp/SecureVaultPro:${admin.email}?secret=${mfaSecret}&issuer=SecureVaultPro`,
                }
            });

        } catch (error) {
            console.error('Admin registration error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Error registering admin'
            });
        }
    },

    // Admin Login
    async login(req, res) {
        try {
            // Validate request body
            const { errors, value } = validate.user.login(req.body);

            if (errors) {
                return res.status(400).json({
                    status: 'error',
                    errors
                });
            }

            // Find admin user
            const admin = await User.findOne({
                email: value.email,
                role: { $in: ['admin'] }
            });

            if (!admin) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Invalid credentials'
                });
            }

            // Check password
            const isPasswordValid = await bcrypt.compare(value.password, admin.password);
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
                const isMFAValid = verifyMFAToken(admin.mfaSecret, value.mfaCode);
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