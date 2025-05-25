import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  points: number;
  tasksCompleted: number;
  uptime: number; // Now stored in seconds
  nodeStatus: boolean;
  nodeStartTime: Date | null;
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  referralPointsEarned?: number;
  isActive?: boolean;
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
    },
    points: {
      type: Number,
      default: 0,
    },
    tasksCompleted: {
      type: Number,
      default: 0,
    },
    uptime: {
      type: Number,
      default: 0,
      description: 'Total uptime in seconds',
    },
    nodeStatus: {
      type: Boolean,
      default: false,
    },
    nodeStartTime: {
      type: Date,
      default: null,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    referralPointsEarned: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Check if the model already exists to prevent overwriting during hot reloads
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;