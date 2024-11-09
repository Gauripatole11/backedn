const mongoose = require('mongoose')


const auditLogSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    action: {
        type: String,
        required: true
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resourceId: mongoose.Schema.Types.ObjectId,
    targetUserId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String
});

const AuditLog = mongoose.model('log', auditLogSchema);

module.exports = AuditLog