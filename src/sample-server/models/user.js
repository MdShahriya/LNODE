import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 },
    quizzesCompleted: { type: Number, default: 0 },
    lastQuizTime: { type: Date, default: null },
    activityLog: [
      {
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        points: { type: Number, default: 0 }
      }
    ],
    referrer: { type: String, default: null },
    referrals: { type: Number, default: 0 }, 
    isDeleted: { type: Boolean, default: false },
    claimedMissions: { type: [Number], default: [] }, 
    canTakeQuiz: { type: Boolean, default: true },
    taskProgress: [{
      taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
      taskNumber: { type: Number },
      status: { 
        type: String, 
        enum: ['pending', 'in-progress', 'verified', 'completed'],
        default: 'pending'
      },
      startedAt: { type: Date },
      verifiedAt: { type: Date },
      completedAt: { type: Date },
      pointsEarned: { type: Number, default: 0 }
    }]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;