const mongoose = require('mongoose');
const RoomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Private', 'Public', 'InviteOnly'], default: 'Public' },
    status: { type: String, enum: ['Waiting', 'Generating', 'Playing', 'Finished'], default: 'Waiting' },
    settings: { maxPlayers: { type: Number, default: 10 }, difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }, questionCount: { type: Number, default: 10 } },
    participants: [
      { userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: { type: String, enum: ['host', 'player'], default: 'player' }, isReady: { type: Boolean, default: false }, joinedAt: { type: Date, default: Date.now } },
    ],
  },
  { timestamps: true }
);
RoomSchema.index({ code: 1 });
RoomSchema.index({ hostId: 1 });
module.exports = mongoose.model('Room', RoomSchema);
