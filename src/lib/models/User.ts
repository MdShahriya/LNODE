import mongoose from 'mongoose';

// Define activity log interface
export interface IActivityLog {
  action: string;
  timestamp: Date;
  points: number;
}

// Define task progress interface
export interface ITaskProgress {
  taskId: mongoose.Types.ObjectId;
  taskNumber: number;
  status: 'pending' | 'in-progress' | 'verified' | 'completed';
  startedAt?: Date;
  verifiedAt?: Date;
  completedAt?: Date;
  pointsEarned: number;
}

// Define the User interface for TypeScript type safety
export interface IUser {
  name: string;
  email: string;
  walletAddress: string;
  bio: string;
  points: number;
  activityLog: IActivityLog[];
  referrer: string | null;
  referrals: number;
  isDeleted: boolean;
  claimedMissions: number[];
  taskProgress: ITaskProgress[];
  createdAt: Date;
  updatedAt: Date;
}

// Define User schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false, // Not required initially
    trim: true,
  },
  email: {
    type: String,
    required: false, // Not required initially
    unique: true,
    sparse: true, // Allows multiple null values (for initial creation)
    lowercase: true,
    trim: true,
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  bio: {
    type: String,
    required: false, // Not required initially
    trim: true,
  },
  points: {
    type: Number,
    default: 0,
  },
  activityLog: [
    {
      action: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      points: { type: Number, default: 0 }
    }
  ],
  referrer: {
    type: String,
    default: null,
  },
  referrals: {
    type: Number,
    default: 0,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  claimedMissions: {
    type: [Number],
    default: [],
  },
  taskProgress: [
    {
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
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create or get the User model
let User: mongoose.Model<IUser>;

try {
  // Check if the model already exists to prevent overwriting
  User = mongoose.model<IUser>('User');
} catch {
  User = mongoose.model<IUser>('User', userSchema);
}

export default User;