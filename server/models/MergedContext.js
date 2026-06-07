const mongoose = require('mongoose');
const MergedContextSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, unique: true },
    content: { type: String, required: true },
    summary: { type: String },
    topicName: { type: String, default: '' },
    status: { type: String, enum: ['Merging', 'Completed'], default: 'Merging' },
    tokenCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
module.exports = mongoose.model('MergedContext', MergedContextSchema);
