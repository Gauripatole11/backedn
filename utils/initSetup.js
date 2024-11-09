// utils/initSetup.js
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const { generateMFASecret, generateToken } = require('./mfa');
const logger = require('./looger');
const qrcode = require('qrcode');

const createInitialAdmin = async () => {
    try {
        // Check if admin already exists
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            await User.findByIdAndDelete(adminExists._id);
        }


        // Initial admin credentials
        const adminData = {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            firstName: 'System',
            lastName: 'Admin',
            adminId: 'ADMIN00001',
            role: 'admin',
            department: 'IT',
            mfaEnabled: true,
            status: 'active'
        };

        // Hash password
        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        // Generate MFA Secret
        const mfaSecret = generateMFASecret();
        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(mfaSecret.otpauthUrl);

        // Create admin user
        const admin = new User({
            ...adminData,
            password: hashedPassword,
            mfaSecret: mfaSecret.base32,
            createdAt: new Date()
        });
        await admin.save();
        logger.info('Initial admin account created successfully');
        logger.info('Admin Email:', adminData.email);
        logger.info('Admin Password:', process.env.ADMIN_PASSWORD);
        logger.info('MFA Secret:', mfaSecret);
        logger.info('Please change these credentials after first login');
        logger.info('QR Code URL:', qrCodeUrl);
        adminData.mfa = mfaSecret
        adminData.qrCodeUrl = qrCodeUrl
        return adminData;

    } catch (error) {
        logger.error('Error creating initial admin:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { createInitialAdmin };