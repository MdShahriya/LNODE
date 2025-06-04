import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description: string;
  rewards: {
    points: number;
  };
  requirements: string[];
  isActive: boolean;
  taskUrl?: string;
  verificationMethod?: {
    type: 'auto' | 'manual';
    urlParam?: string;
    apiEndpoint?: string;
    apiMethod?: 'GET' | 'POST';
    apiParams?: Record<string, string>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    rewards: {
      points: {
        type: Number,
        required: true,
      },
    },
    requirements: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    taskUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string | undefined) {
          if (!v) return true; // Allow empty/undefined values
          return /^https?:\/\/.+/.test(v); // Basic URL validation
        },
        message: 'Task URL must be a valid URL starting with http:// or https://'
      }
    },
    verificationMethod: {
      type: {
        type: String,
        enum: ['auto', 'manual'],
        default: 'manual'
      },
      urlParam: String,
      apiEndpoint: String,
      apiMethod: {
        type: String,
        enum: ['GET', 'POST'],
      },
      apiParams: {
        type: Map,
        of: String
      }
    },
  },
  { timestamps: true }
);

// Check if the model already exists to prevent overwriting during hot reloads
const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;