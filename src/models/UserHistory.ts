import mongoose, { Schema, Document } from 'mongoose';

export interface IUserHistory extends Document {
  user: mongoose.Types.ObjectId;
  walletAddress: string;
  sessionId: string;
  deviceIP: string;
  deviceInfo?: string;
  deviceType?: string;
  browser?: string;
  platform?: string;
  userAgent?: string;
  connectionType: string; // 'login', 'node_start', 'node_stop', etc.
  uptime?: number; // in seconds, optional now
  sessionDuration?: number; // Duration of this specific session
  pointsEarned?: number; // Points earned in this session
  // Enhanced tracking
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  networkInfo?: {
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
  };
  performanceMetrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkLatency?: number;
  };
  // Activity tracking
  activityType?: string; // 'active', 'idle', 'background'
  lastHeartbeat?: Date;
  errorCount?: number;
  warningCount?: number;
  // Metadata
  metadata?: Record<string, unknown>;
  timestamp: Date;
  endTimestamp?: Date;
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
    sessionId: {
      type: String,
      required: true,
      index: true,
      description: 'Unique identifier for this session',
    },
    deviceIP: {
      type: String,
      required: true,
      index: true,
    },
    connectionType: {
      type: String,
      enum: ['login', 'node_start', 'node_stop', 'dashboard_view', 'heartbeat', 'error', 'warning', 'other'],
      default: 'login',
      index: true,
      description: 'Type of connection or activity',
    },
    uptime: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Uptime in seconds for node sessions',
    },
    sessionDuration: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Duration of this specific session in seconds',
    },
    pointsEarned: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Points earned in this session',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      description: 'When this connection occurred',
    },
    endTimestamp: {
      type: Date,
      index: true,
      description: 'When this session ended',
    },
    deviceInfo: {
      type: String,
      default: 'Unknown device',
      description: 'Information about the device used',
    },
    deviceType: {
      type: String,
      default: 'Unknown',
      description: 'Type of device (mobile, desktop, tablet)',
      index: true,
    },
    browser: {
      type: String,
      default: 'Unknown',
      description: 'Browser used for connection',
      index: true,
    },
    platform: {
      type: String,
      default: 'Unknown',
      description: 'Operating system platform',
      index: true,
    },
    userAgent: {
      type: String,
      description: 'Full user agent string',
    },
    // Enhanced tracking
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
    networkInfo: {
      connectionType: {
        type: String,
        enum: ['wifi', 'cellular', 'ethernet', 'unknown'],
        default: 'unknown',
      },
      effectiveType: {
        type: String,
        enum: ['slow-2g', '2g', '3g', '4g', '5g', 'unknown'],
        default: 'unknown',
      },
      downlink: {
        type: Number,
        min: 0,
        description: 'Network downlink speed in Mbps',
      },
    },
    performanceMetrics: {
      cpuUsage: {
        type: Number,
        min: 0,
        max: 100,
        description: 'CPU usage percentage',
      },
      memoryUsage: {
        type: Number,
        min: 0,
        description: 'Memory usage in MB',
      },
      networkLatency: {
        type: Number,
        min: 0,
        description: 'Network latency in ms',
      },
    },
    // Activity tracking
    activityType: {
      type: String,
      enum: ['active', 'idle', 'background', 'unknown'],
      default: 'active',
      index: true,
    },
    lastHeartbeat: {
      type: Date,
      index: true,
      description: 'Last heartbeat received',
    },
    errorCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    warningCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      description: 'Additional metadata for this session',
    },
  },
  { timestamps: true }
);

// Create compound indexes for better query performance
UserHistorySchema.index({ walletAddress: 1, timestamp: -1 });
UserHistorySchema.index({ user: 1, timestamp: -1 });
UserHistorySchema.index({ sessionId: 1, timestamp: -1 });
UserHistorySchema.index({ deviceIP: 1, timestamp: -1 });
UserHistorySchema.index({ connectionType: 1, timestamp: -1 });
UserHistorySchema.index({ activityType: 1, timestamp: -1 });
UserHistorySchema.index({ deviceType: 1, browser: 1, platform: 1 });
UserHistorySchema.index({ 'geolocation.country': 1, 'geolocation.region': 1 });
UserHistorySchema.index({ pointsEarned: -1, sessionDuration: -1 });
UserHistorySchema.index({ lastHeartbeat: -1 });
UserHistorySchema.index({ timestamp: -1, endTimestamp: -1 });
UserHistorySchema.index({ errorCount: -1, warningCount: -1 });

// Check if the model already exists to prevent overwriting during hot reloads
const UserHistory = mongoose.models.UserHistory || mongoose.model<IUserHistory>('UserHistory', UserHistorySchema);

export default UserHistory;