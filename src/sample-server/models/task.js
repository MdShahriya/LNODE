import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    taskNumber: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: { 
      type: String, 
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    dueDate: { type: Date, default: null },
    points: { type: Number, default: 0 },
    taskLink: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    completionCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);
export default Task;