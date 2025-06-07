import mongoose, { Document, Schema } from 'mongoose';

export interface IOpinion extends Document {
  walletAddress: string;
  content: string;
  title: string;
  timestamp: Date;
  creditCost: number;
  priority: number;
  likes: number;
  dislikes: number;
  isVisible: boolean;
  tags: string[];
  likedBy: string[];
  dislikedBy: string[];
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
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 1,
    },
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    likedBy: {
      type: [String],
      default: [],
    },
    dislikedBy: {
      type: [String],
      default: [],
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
  },
  { timestamps: true }
);

export default mongoose.models.Opinion || mongoose.model<IOpinion>('Opinion', OpinionSchema);