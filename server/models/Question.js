const mongoose = require('mongoose');
const QuestionSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    type: { type: String, enum: ['MCQ', 'Rapid', 'TrueFalse', 'Boss'], required: true },
    content: { type: String, required: true },
    options: [{ id: { type: String, required: true }, text: { type: String, required: true } }],
    correctAnswerId: { type: String, required: true },
    timeLimit: { type: Number, default: 15 },
    points: { type: Number, default: 100 },
  },
  { timestamps: true }
);
QuestionSchema.index({ quizId: 1 });
module.exports = mongoose.model('Question', QuestionSchema);
