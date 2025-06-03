import mongoose, { Schema, Document } from 'mongoose';

export interface INodeSession extends Document {
  user: mongoose.Types.ObjectId;
  walletAddress: string;
  sessionId: string;
  deviceIP: string;
  deviceInfo?: string;
  deviceType?: string;
  browser?: string;
  platform?: string;
  userAgent?: string;
  status: string; // 'active', 'inactive', 'error'
  startTime: Date;
  endTime?: Date;
  uptime?: number; // in seconds
  pointsEarned?: number; // Points earned in this session
  // Performance metrics
  performanceMetrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkLatency?: number;
  };
  // Network info
  networkInfo?: {
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
  };
  // Geolocation
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  // Error tracking
  errorCount?: number;
  warningCount?: number;
  lastHeartbeat?: Date;
  // Quality metrics
  nodeQuality?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  performanceScore?: number;
  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NodeSessionSchema: Schema = new Schema(
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
    status: {
      type: String,
      enum: ['active', 'inactive', 'error'],
      default: 'active',
      index: true,
      description: 'Current status of the node session',
    },
    startTime: {
      type: Date,
      default: Date.now,
      index: true,
      description: 'When this session started',
    },
    endTime: {
      type: Date,
      index: true,
      description: 'When this session ended',
    },
    uptime: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Uptime in seconds for this session',
    },
    pointsEarned: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Points earned in this session',
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
    // Performance metrics
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
    // Network info
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
    // Geolocation
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
    // Error tracking
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
    lastHeartbeat: {
      type: Date,
      index: true,
      description: 'Last heartbeat received',
    },
    // Quality metrics
    nodeQuality: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'bronze',
      index: true,
    },
    performanceScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
      index: true,
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
NodeSessionSchema.index({ walletAddress: 1, startTime: -1 });
NodeSessionSchema.index({ user: 1, startTime: -1 });
NodeSessionSchema.index({ sessionId: 1, startTime: -1 });
NodeSessionSchema.index({ deviceIP: 1, startTime: -1 });
NodeSessionSchema.index({ status: 1, startTime: -1 });
NodeSessionSchema.index({ deviceType: 1, browser: 1, platform: 1 });
NodeSessionSchema.index({ 'geolocation.country': 1, 'geolocation.region': 1 });
NodeSessionSchema.index({ pointsEarned: -1, uptime: -1 });
NodeSessionSchema.index({ lastHeartbeat: -1 });
NodeSessionSchema.index({ startTime: -1, endTime: -1 });
NodeSessionSchema.index({ errorCount: -1, warningCount: -1 });
NodeSessionSchema.index({ nodeQuality: 1, performanceScore: -1 });

// Check if the model already exists to prevent overwriting during hot reloads
const NodeSession = mongoose.models.NodeSession || mongoose.model<INodeSession>('NodeSession', NodeSessionSchema);

export default NodeSession;