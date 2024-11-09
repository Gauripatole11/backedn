// models/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String
    },
    firstName: String,
    lastName: String,
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    department: String,
    employeeId: {
        type: String,
        unique: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    lastLogin: Date,
    mfaEnabled: {
        type: Boolean,
        default: false
    },
    mfaSecret: String,
    fidoRegistered: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    mfaBackupCodes: [{
        code: String,
        used: {
            type: Boolean,
            default: false
        }
    }],
    updatedAt: Date
});

const User = mongoose.model('User', userSchema);
module.exports = User;