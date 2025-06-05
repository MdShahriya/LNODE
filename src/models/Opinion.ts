import mongoose, { Schema, Document } from 'mongoose';

export interface IOpinion extends Document {
  walletAddress: string;
  content: string;
  title: string;
  timestamp: Date;
  creditCost: number;
  pointsTransactionId: mongoose.Types.ObjectId;
  likes: number;
  dislikes: number;
  isVisible: boolean;
  tags: string[];
  // Remove paymentTxHash field from interface
}

const OpinionSchema: Schema = new Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    creditCost: {
      type: Number,
      required: true,
      min: 1, // Minimum 1 credit
      default: 1,
    },
    pointsTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'PointsHistory',
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
      },
    ],
    // Remove paymentTxHash field from schema
  },
  { timestamps: true }
);

export default mongoose.models.Opinion || mongoose.model<IOpinion>('Opinion', OpinionSchema);