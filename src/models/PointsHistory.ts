import mongoose, { Schema, Document } from 'mongoose';

export interface IPointsHistory extends Document {
  user: mongoose.Types.ObjectId;
  walletAddress: string;
  points: number;
  source: 'node' | 'referral' | 'task' | 'checkin' | 'bonus' | 'achievement' | 'daily_bonus' | 'weekly_bonus' | 'monthly_bonus' | 'penalty' | 'adjustment' | 'other';
  subSource?: string; // More specific categorization
  description?: string;
  // Enhanced tracking
  sessionId?: string; // Link to UserHistory session
  taskId?: mongoose.Types.ObjectId; // Link to specific task
  achievementId?: mongoose.Types.ObjectId; // Link to specific achievement
  referralId?: mongoose.Types.ObjectId; // Link to referral
  multiplier?: number; // Points multiplier applied
  basePoints?: number; // Points before multiplier
  // Transaction details
  transactionType: 'credit' | 'debit';
  balanceBefore?: number;
  balanceAfter?: number;
  // Validation and verification
  isVerified?: boolean;
  verifiedBy?: string;
  verificationDate?: Date;
  // Expiration (for temporary points)
  expiresAt?: Date;
  isExpired?: boolean;
  // Metadata
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PointsHistorySchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
      description: 'Final points amount (after multiplier)',
    },
    source: {
      type: String,
      enum: ['node', 'referral', 'task', 'checkin', 'bonus', 'achievement', 'daily_bonus', 'weekly_bonus', 'monthly_bonus', 'penalty', 'adjustment', 'other'],
      required: true,
      index: true,
    },
    subSource: {
      type: String,
      trim: true,
      index: true,
      description: 'More specific categorization of the source',
    },
    description: {
      type: String,
      trim: true,
    },
    // Enhanced tracking
    sessionId: {
      type: String,
      index: true,
      description: 'Link to UserHistory session',
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      index: true,
    },
    achievementId: {
      type: Schema.Types.ObjectId,
      ref: 'Achievement',
      index: true,
    },
    referralId: {
      type: Schema.Types.ObjectId,
      ref: 'Referral',
      index: true,
    },
    multiplier: {
      type: Number,
      default: 1,
      min: 0,
      description: 'Points multiplier applied',
    },
    basePoints: {
      type: Number,
      description: 'Points before multiplier',
    },
    // Transaction details
    transactionType: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
      index: true,
    },
    balanceBefore: {
      type: Number,
      min: 0,
      description: 'User balance before this transaction',
    },
    balanceAfter: {
      type: Number,
      min: 0,
      description: 'User balance after this transaction',
    },
    // Validation and verification
    isVerified: {
      type: Boolean,
      default: true,
      index: true,
    },
    verifiedBy: {
      type: String,
      description: 'Who verified this transaction',
    },
    verificationDate: {
      type: Date,
      description: 'When this transaction was verified',
    },
    // Expiration (for temporary points)
    expiresAt: {
      type: Date,
      index: true,
      description: 'When these points expire (if applicable)',
    },
    isExpired: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      description: 'Additional metadata for this points transaction',
    },
    ipAddress: {
      type: String,
      description: 'IP address when points were earned',
    },
    userAgent: {
      type: String,
      description: 'User agent when points were earned',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Create compound indexes for better query performance
PointsHistorySchema.index({ walletAddress: 1, timestamp: -1 });
PointsHistorySchema.index({ user: 1, timestamp: -1 });
PointsHistorySchema.index({ source: 1, timestamp: -1 });
PointsHistorySchema.index({ subSource: 1, timestamp: -1 });
PointsHistorySchema.index({ transactionType: 1, timestamp: -1 });
PointsHistorySchema.index({ isVerified: 1, timestamp: -1 });
PointsHistorySchema.index({ expiresAt: 1, isExpired: 1 });
PointsHistorySchema.index({ sessionId: 1, timestamp: -1 });
PointsHistorySchema.index({ taskId: 1, achievementId: 1 });
PointsHistorySchema.index({ points: -1, timestamp: -1 });
PointsHistorySchema.index({ balanceAfter: -1, timestamp: -1 });
PointsHistorySchema.index({ timestamp: -1 });

// Check if the model already exists to prevent overwriting during hot reloads
const PointsHistory = mongoose.models.PointsHistory || mongoose.model<IPointsHistory>('PointsHistory', PointsHistorySchema);

export default PointsHistory;