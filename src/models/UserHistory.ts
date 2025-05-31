import mongoose, { Schema, Document } from 'mongoose';

export interface IUserHistory extends Document {
  user: mongoose.Types.ObjectId;
  walletAddress: string;
  deviceIP: string;
  deviceInfo?: string;
  earnings: number;
  earningType: string; // 'node', 'referral', 'task', 'checkin', etc.
  uptime: number; // in seconds
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserHistorySchema: Schema = new Schema(
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
    deviceIP: {
      type: String,
      required: true,
    },
    earnings: {
      type: Number,
      default: 0,
      description: 'Points earned in this session',
    },
    earningType: {
      type: String,
      enum: ['node', 'referral', 'task', 'checkin', 'other'],
      default: 'node',
      description: 'Source of earnings',
    },
    uptime: {
      type: Number,
      default: 0,
      description: 'Uptime in seconds for this session',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      description: 'When this earning occurred',
    },
    deviceInfo: {
      type: String,
      default: 'Unknown device',
      description: 'Information about the device used',
    },
  },
  { timestamps: true }
);

// Create indexes for efficient querying
UserHistorySchema.index({ walletAddress: 1, timestamp: -1 });
UserHistorySchema.index({ user: 1, timestamp: -1 });
UserHistorySchema.index({ timestamp: -1 });

// Check if the model already exists to prevent overwriting during hot reloads
const UserHistory = mongoose.models.UserHistory || mongoose.model<IUserHistory>('UserHistory', UserHistorySchema);

export default UserHistory;