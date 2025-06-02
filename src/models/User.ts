import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  points: number;
  tasksCompleted: number;
  uptime: number; // Total uptime in seconds
  nodeStatus: boolean;
  nodeStartTime: Date | null;
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  referralPointsEarned?: number;
  isActive?: boolean;
  // Enhanced tracking fields
  totalSessions: number;
  activeSessions: number;
  lastActiveTime: Date | null;
  deviceCount: number;
  totalEarnings: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  // Performance metrics
  averageSessionDuration: number;
  longestSession: number;
  totalConnectionTime: number;
  // Check-in related fields
  lastCheckIn?: Date | null;
  currentStreak?: number;
  longestStreak?: number;
  maxStreak?: number;
  totalCheckIns?: number;
  checkInPointsEarned?: number;
  // Profile enhancements
  username?: string;
  email?: string;
  profilePicture?: string;
  preferences?: {
    notifications: boolean;
    autoStart: boolean;
    theme: string;
  };
  // Security and verification
  isVerified: boolean;
  verificationLevel: number;
  lastLoginTime: Date | null;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    tasksCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    uptime: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Total uptime in seconds',
    },
    nodeStatus: {
      type: Boolean,
      default: false,
      index: true,
    },
    nodeStartTime: {
      type: Date,
      default: null,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    referralPointsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Enhanced tracking fields
    totalSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastActiveTime: {
      type: Date,
      default: null,
      index: true,
    },
    deviceCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarnings: {
      type: Object,
      default: {
        daily: 0,
        weekly: 0,
        monthly: 0
      }
    },
    dailyEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    weeklyEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Performance metrics
    averageSessionDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestSession: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalConnectionTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Check-in related fields
    lastCheckIn: {
      type: Date,
      default: null,
      index: true,
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCheckIns: {
      type: Number,
      default: 0,
      min: 0,
    },
    checkInPointsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Profile enhancements
    username: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    profilePicture: {
      type: String,
      trim: true,
    },
    preferences: {
      notifications: {
        type: Boolean,
        default: true,
      },
      autoStart: {
        type: Boolean,
        default: false,
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'dark',
      },
    },
    // Security and verification
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    lastLoginTime: {
      type: Date,
      default: null,
      index: true,
    },
    loginCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Create compound indexes for better query performance
// Removed duplicate single-field indexes that are already defined with index: true
UserSchema.index({ nodeStatus: 1, isActive: 1 });
UserSchema.index({ points: -1, totalEarnings: -1 });
UserSchema.index({ lastCheckIn: -1, currentStreak: -1 });
UserSchema.index({ isVerified: 1, verificationLevel: -1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ totalSessions: -1, activeSessions: -1 });
UserSchema.index({ dailyEarnings: -1, weeklyEarnings: -1, monthlyEarnings: -1 });

// Check if the model already exists to prevent overwriting during hot reloads
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;