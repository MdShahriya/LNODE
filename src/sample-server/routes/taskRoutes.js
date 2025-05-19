import express from 'express';
import Task from '../models/task.js';
import User from '../models/user.js';
import { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ADMIN ROUTES

// Get all tasks (admin only)
router.get('/', isAdmin, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    
    // For each task, get completion count from users collection
    const tasksWithStats = await Promise.all(tasks.map(async (task) => {
      const taskObj = task.toObject();
      
      // Count users who have completed this task
      const completionCount = await User.countDocuments({
        'taskProgress.taskId': task._id,
        'taskProgress.status': 'completed'
      });
      
      taskObj.completionCount = completionCount;
      return taskObj;
    }));
    
    res.json(tasksWithStats);
  } catch (error) {
    console.error("❌ Get Tasks Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Create a new task (admin only)
router.post('/', isAdmin, async (req, res) => {
  try {
    const { title, description, status, dueDate, points, taskLink, profileImage } = req.body;
    
    // Get the highest task number and increment by 1
    const highestTask = await Task.findOne().sort('-taskNumber');
    const taskNumber = highestTask ? highestTask.taskNumber + 1 : 1;
    
    const task = new Task({
      taskNumber,
      title,
      description,
      status,
      dueDate,
      points: points || 0,
      taskLink: taskLink || "",
      profileImage: profileImage || ""
    });
    
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error("❌ Create Task Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Update a task (admin only)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, dueDate, points, taskLink, profileImage } = req.body;
    
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Update task fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (points !== undefined) task.points = points;
    if (taskLink !== undefined) task.taskLink = taskLink;
    if (profileImage !== undefined) task.profileImage = profileImage;
    
    await task.save();
    res.json(task);
  } catch (error) {
    console.error("❌ Update Task Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a task (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    await Task.findByIdAndDelete(id);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("❌ Delete Task Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// USER ROUTES

// Get available tasks for a user
router.get('/available/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Find the user
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get all active tasks
    const tasks = await Task.find({ status: { $ne: "completed" } }).sort({ taskNumber: 1 });
    
    // Get IDs of tasks the user has already completed
    const completedTaskIds = user.taskProgress
      .filter(progress => progress.status === 'completed')
      .map(progress => progress.taskId.toString());
    
    // Add user progress information to each task
    const tasksWithProgress = tasks.map(task => {
      const taskObj = task.toObject();
      
      // Skip tasks that are already completed
      if (completedTaskIds.includes(task._id.toString())) {
        return null;
      }
      
      // Find user progress for this task
      const progress = user.taskProgress.find(
        p => p.taskId.toString() === task._id.toString()
      );
      
      if (progress) {
        taskObj.userProgress = {
          status: progress.status,
          startedAt: progress.startedAt,
          verifiedAt: progress.verifiedAt
        };
      } else {
        taskObj.userProgress = { status: 'pending' };
      }
      
      return taskObj;
    }).filter(task => task !== null); // Remove null entries (completed tasks)
    
    res.json(tasksWithProgress);
  } catch (error) {
    console.error("❌ Get Available Tasks Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Start a task (move from pending to in-progress)
router.post('/start/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    
    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user already has progress for this task
    const progressIndex = user.taskProgress.findIndex(
      p => p.taskId.toString() === taskId
    );
    
    if (progressIndex !== -1) {
      // Update existing progress if not already completed
      if (user.taskProgress[progressIndex].status === 'completed') {
        return res.status(400).json({ error: "You have already completed this task" });
      }
      
      user.taskProgress[progressIndex].status = 'in-progress';
      user.taskProgress[progressIndex].startedAt = new Date();
    } else {
      // Add new progress entry
      user.taskProgress.push({
        taskId,
        taskNumber: task.taskNumber,
        status: 'in-progress',
        startedAt: new Date()
      });
    }
    
    await user.save();
    
    res.json({ 
      message: "Task started successfully",
      taskId: task._id,
      status: 'in-progress'
    });
  } catch (error) {
    console.error("❌ Start Task Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify a task (mark as ready for claiming)
router.post('/verify/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    
    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Find user progress for this task
    const progressIndex = user.taskProgress.findIndex(
      p => p.taskId.toString() === taskId
    );
    
    if (progressIndex === -1) {
      return res.status(400).json({ error: "You need to start this task first" });
    }
    
    if (user.taskProgress[progressIndex].status === 'completed') {
      return res.status(400).json({ error: "You have already completed this task" });
    }
    
    // Update progress status
    user.taskProgress[progressIndex].status = 'verified';
    user.taskProgress[progressIndex].verifiedAt = new Date();
    
    await user.save();
    
    res.json({ 
      message: "Task verified successfully",
      taskId: task._id,
      status: 'verified'
    });
  } catch (error) {
    console.error("❌ Verify Task Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Complete a task and earn points
router.post('/complete/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    
    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Find the user
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Find user progress for this task
    const progressIndex = user.taskProgress.findIndex(
      p => p.taskId.toString() === taskId
    );
    
    if (progressIndex === -1) {
      return res.status(400).json({ error: "You need to start this task first" });
    }
    
    if (user.taskProgress[progressIndex].status === 'completed') {
      return res.status(400).json({ error: "You have already completed this task" });
    }
    
    if (user.taskProgress[progressIndex].status !== 'verified') {
      return res.status(400).json({ error: "You need to verify this task first" });
    }
    
    // Update progress status
    user.taskProgress[progressIndex].status = 'completed';
    user.taskProgress[progressIndex].completedAt = new Date();
    user.taskProgress[progressIndex].pointsEarned = task.points;
    
    // Update user's points
    user.points += task.points;
    
    // Add to activity log
    if (!user.activityLog) {
      user.activityLog = [];
    }
    
    user.activityLog.push({
      action: `Completed task #${task.taskNumber}: ${task.title}`,
      activity: `Completed task #${task.taskNumber}: ${task.title}`, // For compatibility with different log formats
      points: task.points,
      timestamp: new Date()
    });
    
    await user.save();
    
    console.log(`✅ User ${walletAddress} completed task ${taskId} and earned ${task.points} points`);
    
    res.json({ 
      message: "Task completed successfully", 
      pointsEarned: task.points,
      newTotalPoints: user.points
    });
  } catch (error) {
    console.error("❌ Complete Task Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get completed tasks for a user
router.get('/completed/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Find the user
    const user = await User.findOne({ walletAddress });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get completed task IDs
    const completedTaskProgress = user.taskProgress
      .filter(p => p.status === 'completed');
    
    if (completedTaskProgress.length === 0) {
      return res.json([]);
    }
    
    // Get task IDs
    const completedTaskIds = completedTaskProgress.map(p => p.taskId);
    
    // Find the tasks
    const tasks = await Task.find({ _id: { $in: completedTaskIds } });
    
    // Add completion details to each task
    const tasksWithCompletionDetails = tasks.map(task => {
      const taskObj = task.toObject();
      
      // Find user progress for this task
      const progress = completedTaskProgress.find(
        p => p.taskId.toString() === task._id.toString()
      );
      
      if (progress) {
        taskObj.completedAt = progress.completedAt;
        taskObj.pointsEarned = progress.pointsEarned;
      }
      
      return taskObj;
    });
    
    res.json(tasksWithCompletionDetails);
  } catch (error) {
    console.error("❌ Get Completed Tasks Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;