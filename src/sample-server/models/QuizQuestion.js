import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(options) {
        return options.length >= 2; // At least 2 options required
      },
      message: "Quiz question must have at least 2 options"
    }
  },
  answer: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(value) {
        // Ensure the answer index is valid for the options array
        return Number.isInteger(value) && value >= 0 && value < this.options.length;
      },
      message: "Answer index must be valid"
    }
  },
  // You could add these optional fields if needed
  category: {
    type: String,
    enum: ['crypto', 'blockchain', 'defi', 'nft', 'general'],
    default: 'general'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const QuizQuestion = mongoose.model("QuizQuestion", quizQuestionSchema);

export default QuizQuestion;