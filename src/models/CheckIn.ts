import mongoose, { Schema, Document } from 'mongoose';

export interface ICheckIn extends Document {
  user: mongoose.Types.ObjectId;
  walletAddress: string;
  date: Date;
  points: number;
  basePoints: number;
  bonusPoints: number;
  streak: number;
  previousStreak: number;
  maxStreak: number;
  // Enhanced tracking
  checkInType: 'daily' | 'weekly' | 'monthly' | 'special' | 'first_time' | 'streak_break' | 'yearly' | 'centennial';
  isConsecutive: boolean;
  missedDays: number;
  // Rewards and multipliers
  multiplier: number;
  rewardTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  specialReward?: string;
  // Device and location info
  deviceInfo?: {
    type: string;
    browser: string;
    platform: string;
    userAgent: string;
  };
  ipAddress?: string;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  // Validation
  isValid: boolean;
  validationReason?: string;
  // Metadata
  metadata?: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CheckInSchema: Schema = new Schema(
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
    date: {
      type: Date,
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
      min: 0,
      description: 'Total points earned (base + bonus)',
    },
    basePoints: {
      type: Number,
      required: true,
      min: 0,
      description: 'Base points before multipliers',
    },
    bonusPoints: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Bonus points from streak/special events',
    },
    streak: {
      type: Number,
      default: 1,
      min: 0,
      index: true,
    },
    previousStreak: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Previous streak before this check-in',
    },
    maxStreak: {
      type: Number,
      default: 1,
      min: 0,
      description: 'Maximum streak achieved by user',
    },
    // Enhanced tracking
    checkInType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'special', 'first_time', 'streak_break', 'yearly', 'centennial'],
      default: 'daily',
      index: true,
    },
    isConsecutive: {
      type: Boolean,
      default: true,
      index: true,
      description: 'Whether this check-in continues the streak',
    },
    missedDays: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Number of days missed before this check-in',
    },
    // Rewards and multipliers
    multiplier: {
      type: Number,
      default: 1,
      min: 0,
      description: 'Points multiplier applied',
    },
    rewardTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'bronze',
      index: true,
    },
    specialReward: {
      type: String,
      description: 'Special reward earned (if any)',
    },
    // Device and location info
    deviceInfo: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown',
      },
      browser: {
        type: String,
        default: 'unknown',
      },
      platform: {
        type: String,
        default: 'unknown',
      },
      userAgent: {
        type: String,
      },
    },
    ipAddress: {
      type: String,
      description: 'IP address when check-in was performed',
    },
    geolocation: {
      country: {
        type: String,
        trim: true,
      },
      region: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      timezone: {
        type: String,
        trim: true,
      },
    },
    // Validation
    isValid: {
      type: Boolean,
      default: true,
      index: true,
    },
    validationReason: {
      type: String,
      description: 'Reason if check-in is invalid',
    },
    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      description: 'Additional metadata for this check-in',
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
CheckInSchema.index({ walletAddress: 1, date: -1 });
CheckInSchema.index({ user: 1, date: -1 });
CheckInSchema.index({ date: -1, checkInType: 1 });
CheckInSchema.index({ streak: -1, maxStreak: -1 });
CheckInSchema.index({ rewardTier: 1, points: -1 });
CheckInSchema.index({ isConsecutive: 1, streak: -1 });
CheckInSchema.index({ isValid: 1, timestamp: -1 });
CheckInSchema.index({ 'geolocation.country': 1, 'geolocation.region': 1 });
CheckInSchema.index({ 'deviceInfo.type': 1, 'deviceInfo.platform': 1 });
CheckInSchema.index({ timestamp: -1 });

// Check if the model already exists to prevent overwriting during hot reloads
const CheckIn = mongoose.models.CheckIn || mongoose.model<ICheckIn>('CheckIn', CheckInSchema);

export default CheckIn;