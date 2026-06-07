const mongoose = require('mongoose');
const QuizSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    contextId: { type: mongoose.Schema.Types.ObjectId, ref: 'MergedContext', required: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    status: { type: String, enum: ['Draft', 'Ready'], default: 'Draft' },
    timerMode: { type: String },
    timerConfig: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);
QuizSchema.index({ roomId: 1 });
module.exports = mongoose.model('Quiz', QuizSchema);
