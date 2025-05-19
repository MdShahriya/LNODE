import mongoose from 'mongoose';
import { IUser } from './User';

// Define the Airdrop interface for TypeScript type safety
export interface IAirdrop {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  totalAmount: number;
  tokenSymbol: string;
  startDate: Date;
  endDate: Date;
  requirements: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define the UserAirdrop interface for tracking user airdrop eligibility
export interface IUserAirdrop {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId | IUser;
  airdrop: mongoose.Types.ObjectId | IAirdrop;
  status: 'eligible' | 'claimed' | 'ineligible';
  eligibilityScore: number;
  claimedAmount: number;
  claimedAt?: Date;
  transactionHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define Airdrop schema
const airdropSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  tokenSymbol: {
    type: String,
    required: true,
    trim: true,
    default: 'TOPAY',
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  requirements: {
    type: String,
    required: false,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
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

// Define UserAirdrop schema for tracking user airdrop eligibility
const userAirdropSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  airdrop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Airdrop',
    required: true,
  },
  status: {
    type: String,
    enum: ['eligible', 'claimed', 'ineligible'],
    default: 'ineligible',
  },
  eligibilityScore: {
    type: Number,
    default: 0,
  },
  claimedAmount: {
    type: Number,
    default: 0,
  },
  claimedAt: {
    type: Date,
  },
  transactionHash: {
    type: String,
    trim: true,
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

// Create compound index to ensure a user can only have one entry per airdrop
userAirdropSchema.index({ user: 1, airdrop: 1 }, { unique: true });

// Create or get the Airdrop model
let Airdrop: mongoose.Model<IAirdrop>;
let UserAirdrop: mongoose.Model<IUserAirdrop>;

try {
  // Check if the models already exist to prevent overwriting
  Airdrop = mongoose.model<IAirdrop>('Airdrop');
} catch {
  Airdrop = mongoose.model<IAirdrop>('Airdrop', airdropSchema);
}

try {
  UserAirdrop = mongoose.model<IUserAirdrop>('UserAirdrop');
} catch {
  UserAirdrop = mongoose.model<IUserAirdrop>('UserAirdrop', userAirdropSchema);
}

export { Airdrop, UserAirdrop };