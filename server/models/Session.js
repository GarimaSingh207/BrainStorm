const mongoose = require('mongoose');
const SessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    refreshToken: { type: String, required: true },
    deviceInfo: { type: String, required: true },
    ipAddress: { type: String, required: true },
    lastActivity: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ userId: 1 });
module.exports = mongoose.model('Session', SessionSchema);
