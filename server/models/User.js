const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    tokenVersion: { type: Number, default: 0 },
    stats: { totalGames: { type: Number, default: 0 }, wins: { type: Number, default: 0 }, averageAccuracy: { type: Number, default: 0 }, streak: { type: Number, default: 0 } },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
module.exports = mongoose.model('User', UserSchema);
