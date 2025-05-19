import mongoose from 'mongoose';
import { IUser } from './User';

// Define the Task interface for TypeScript type safety
export interface ITask {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  points: number;
  requirements: string;
  completionSteps: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define the UserTask interface for tracking user task completion
export interface IUserTask {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId | IUser;
  task: mongoose.Types.ObjectId | ITask;
  status: 'pending' | 'completed' | 'verified';
  completionDate?: Date;
  verificationDate?: Date;
  proofOfWork?: string;
  earnedPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

// Define Task schema
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  points: {
    type: Number,
    required: true,
    default: 0,
  },
  requirements: {
    type: String,
    required: false,
    trim: true,
  },
  completionSteps: {
    type: String,
    required: false,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: ['social', 'community', 'technical', 'other'],
    default: 'other',
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

// Define UserTask schema for tracking user task completion
const userTaskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'verified'],
    default: 'pending',
  },
  completionDate: {
    type: Date,
  },
  verificationDate: {
    type: Date,
  },
  proofOfWork: {
    type: String,
    trim: true,
  },
  earnedPoints: {
    type: Number,
    default: 0,
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

// Create compound index to ensure a user can only have one entry per task
userTaskSchema.index({ user: 1, task: 1 }, { unique: true });

// Create or get the Task model
let Task: mongoose.Model<ITask>;
let UserTask: mongoose.Model<IUserTask>;

try {
  // Check if the models already exist to prevent overwriting
  Task = mongoose.model<ITask>('Task');
} catch {
  Task = mongoose.model<ITask>('Task', taskSchema);
}

try {
  UserTask = mongoose.model<IUserTask>('UserTask');
} catch {
  UserTask = mongoose.model<IUserTask>('UserTask', userTaskSchema);
}

export { Task, UserTask };