// models/securityKey.model.js
const mongoose = require('mongoose');
const KeyAssignment = require('./keyAssignment.model');
const securityKeySchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  credentialId: {
    type: String,
    sparse: true,
    index: {
      unique: true,
      partialFilterExpression: { credentialId: { $type: "string" } }
    },
    required: true
  },
  publicKey: {
    type: String,
    sparse: true
  },
  aaguid: {
    type: String,
    sparse: true,
    set: function (value) {
      if (value instanceof ArrayBuffer) {
        return Buffer.from(value).toString('hex');
      }
      return value;
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'assigned'],
    default: 'available'
  },
  signCount: {
    type: Number,
    default: 0
  },
  currentAssignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KeyAssignment',
    default: null
  },
  userHandle: {
    type: String,
    index: true
  },
  // Timestamps
  lastUsed: {
    type: Date,
    default: Date.now
  },
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  deviceName: {
    type: String,
    default: 'Security Key'
  },
  notes: String
}, {
  timestamps: true
});

// Methods
securityKeySchema.methods = {
// Check if key is available for assignment
isAvailableForAssignment() {
  return this.status === 'available' && !this.currentAssignment;
},
  // Assign key to user
  async assign(userId, assignedBy) {
    if (!this.isAvailableForAssignment()) {
      throw new Error('Key is not available for assignment');
    }
    const assignment = new KeyAssignment({
      keyId: this._id,
      userId,
      assignedBy
    });

    await assignment.save();
    this.status = 'assigned';
    this.currentAssignment = assignment._id;
    await this.save();
    return assignment;
  }
};

const SecurityKey = mongoose.model('SecurityKey', securityKeySchema);

module.exports = SecurityKey;