import mongoose, { Schema, Document } from 'mongoose';

export interface ICheckIn extends Document {
  user: mongoose.Types.ObjectId;
  walletAddress: string;
  date: Date;
  points: number;
  streak: number;
  createdAt: Date;
  updatedAt: Date;
}

const CheckInSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
    },
    date: {
      type: Date,
      required: true,
    },
    points: {
      type: Number,
      required: true,
      default: 0,
    },
    streak: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  { timestamps: true }
);

// Create indexes for faster queries
CheckInSchema.index({ walletAddress: 1, date: 1 }, { unique: true });
CheckInSchema.index({ date: -1 });

// Check if the model already exists to prevent overwriting during hot reloads
const CheckIn = mongoose.models.CheckIn || mongoose.model<ICheckIn>('CheckIn', CheckInSchema);

export default CheckIn;