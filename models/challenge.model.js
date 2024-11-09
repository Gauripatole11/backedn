const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challenge: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['registration', 'authentication'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Document will be automatically deleted after 5 minutes
  }
});

// Create indexes
challengeSchema.index({ userId: 1, type: 1 });
challengeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 }); // TTL index

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;