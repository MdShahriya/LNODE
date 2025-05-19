import mongoose from 'mongoose';
import { IUser } from './User';

// Define the Referral interface for TypeScript type safety
export interface IReferral {
  referrer: mongoose.Types.ObjectId | IUser;
  referee: mongoose.Types.ObjectId | IUser;
  referralCode: string;
  status: 'pending' | 'completed';
  pointsAwarded: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define Referral schema
const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  referee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  referralCode: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  pointsAwarded: {
    type: Number,
    default: 0,
  },
  completedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create compound index to ensure uniqueness of referrer-referee pairs
referralSchema.index({ referrer: 1, referee: 1 }, { unique: true });

// Create index on referralCode for quick lookups
referralSchema.index({ referralCode: 1 });

// Create or get the Referral model
let Referral: mongoose.Model<IReferral>;

try {
  // Check if the model already exists to prevent overwriting
  Referral = mongoose.model<IReferral>('Referral');
} catch {
  Referral = mongoose.model<IReferral>('Referral', referralSchema);
}

export default Referral;