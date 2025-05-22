import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  points: number;
  tasksCompleted: number;
  uptime: number;
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
    },
  },
  { timestamps: true }
);

// Check if the model already exists to prevent overwriting during hot reloads
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;