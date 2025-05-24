import mongoose, { Schema, Document } from 'mongoose';

export interface IUserTask extends Document {
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  status: 'available' | 'in_progress' | 'completed';
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserTaskSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'in_progress', 'completed'],
      default: 'available',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Create a compound index to ensure a user can only have one entry per task
UserTaskSchema.index({ userId: 1, taskId: 1 }, { unique: true });

// Check if the model already exists to prevent overwriting during hot reloads
const UserTask = mongoose.models.UserTask || mongoose.model<IUserTask>('UserTask', UserTaskSchema);

export default UserTask;