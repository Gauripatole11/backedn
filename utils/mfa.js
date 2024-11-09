// utils/mfa.js
const speakeasy = require('speakeasy');

exports.generateMFASecret = () => {
    // Generate a new secret using speakeasy
    const secretObject = speakeasy.generateSecret({
        name: 'SecureVaultPro',
        length: 20
    });
    
    return {
        otpauthUrl: secretObject.otpauth_url,
        base32: secretObject.base32
    };
};

exports.verifyMFAToken = (secret, token) => {
    try {
        // Verify the token using the base32 secret
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1, // Allow 1 step before/after for time skew
            step: 30  // 30-second step
        });
    } catch (error) {
        console.error('MFA Verification Error:', error);
        return false;
    }
};

// Generate a current token (useful for testing)
exports.generateToken = (secret) => {
    return speakeasy.totp({
        secret: secret,
        encoding: 'base32'
    });
};