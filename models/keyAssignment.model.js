const mongoose = require('mongoose');

const keyAssignmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    keyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SecurityKey',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'revoked'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Important: Change model name to 'KeyAssignment' to match the reference
const KeyAssignment = mongoose.model('KeyAssignment', keyAssignmentSchema);

module.exports = KeyAssignment;