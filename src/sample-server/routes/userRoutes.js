import express from 'express';
import User from '../models/user.js';
import { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register or get user by wallet address and handle referral
router.post("/login", async (req, res) => {
  console.log("🔍 Incoming Request Body:", req.body); // Debug log

  const { walletAddress, referrer } = req.body; // Capture walletAddress and referrer from request body

  if (!walletAddress) {
    console.log("❌ walletAddress is missing in request"); // Debug log
    return res.status(400).json({ error: "walletAddress is required" });
  }

  try {
    // Check if the user exists by wallet address
    let user = await User.findOne({ walletAddress });

    if (!user) {
      // If the user doesn't exist, create a new user with 0 points and no referrer initially
      user = await User.create({ 
        walletAddress, 
        points: 0, 
        referrer: referrer || null,
        taskProgress: [], // Initialize empty task progress array
        activityLog: [], // Initialize empty activity log
        quizzesCompleted: 0,
        referrals: 0,
        claimedMissions: []
      });
      console.log(`✅ New user created: ${walletAddress}`); // Debug log for new user
    } else {
      console.log(`✅ User found: ${walletAddress}`); // Debug log for found user
    }

    // Handle referral if referrer is provided
    if (referrer && referrer !== walletAddress) {
      // Update the user's referrer if it's different from the walletAddress
      user.referrer = referrer;
      await user.save();

      // Find the referrer user and increment their referrals count
      const referrerUser = await User.findOne({ walletAddress: referrer });
      if (referrerUser) {
        referrerUser.referrals += 1; // Increment referrer's referral count
        await referrerUser.save();
        console.log(`✅ Referrals updated for referrer: ${referrer}`); // Debug log for referrer
      } else {
        console.log("❌ Referrer not found"); // Debug log for missing referrer
      }
    }

    // Return the user data including points and referrals
    res.json({
      walletAddress: user.walletAddress,
      points: user.points,
      referrals: user.referrals,
    });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint to get user wallet address and points, with a check for taking quiz today
router.get("/get-user/:walletAddress", async (req, res) => {
  const { walletAddress } = req.params;

  if (!walletAddress) {
    return res.status(400).json({ error: "walletAddress is required" });
  }

  try {
    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Current time in local time (user's time zone)
    const currentTime = new Date();
    const localMidnight = new Date(currentTime.setHours(0, 0, 0, 0)); // Set to 12:00 AM local time

    // If the user hasn't played after midnight local time, allow the quiz
    const lastQuizTime = user.lastQuizTime ? new Date(user.lastQuizTime) : 0;
    const canTakeQuiz = lastQuizTime < localMidnight.getTime(); // Check if the last quiz time is before today's midnight local time

    // Count completed tasks
    const completedTasksCount = user.taskProgress ? 
      user.taskProgress.filter(task => task.status === 'completed').length : 0;

    res.json({
      walletAddress: user.walletAddress,
      points: user.points,
      quizzesCompleted: user.quizzesCompleted,
      referrals: user.referrals,
      canTakeQuiz,
      claimedMissions: user.claimedMissions || [],
      completedTasksCount,
      activityLog: user.activityLog || []
    });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint to add points to the user's account and increment quizzesCompleted
router.post("/add-points", async (req, res) => {
  const { walletAddress, pointsToAdd } = req.body;

  if (!walletAddress || pointsToAdd === undefined) {
    return res.status(400).json({ error: "walletAddress and pointsToAdd are required" });
  }

  try {
    let user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Increment the points and quizzesCompleted
    user.points += pointsToAdd;
    user.quizzesCompleted += 10;  // Increment quizzes completed by 1

    // Update lastQuizTime to current time (local time)
    user.lastQuizTime = new Date();
    user.lastQuizDate = new Date(); // For compatibility with quiz routes

    // Add to activity log
    if (!user.activityLog) {
      user.activityLog = [];
    }
    
    user.activityLog.push({
      action: "Completed quiz",
      activity: "Completed quiz", // For compatibility with different log formats
      points: pointsToAdd,
      timestamp: new Date()
    });

    await user.save();

    res.json({ 
      message: `Points added successfully!`, 
      pointsEarned: pointsToAdd,
      newPoints: user.points, 
      quizzesCompleted: user.quizzesCompleted 
    });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint to get leaderboard data
router.get("/leaderboard", async (req, res) => {
  try {
    // Get top 100 users by points, excluding deleted users
    const leaderboard = await User.find({ isDeleted: { $ne: true } })
      .sort({ points: -1 })
      .limit(100)
      .select("walletAddress points referrals");

    res.json(leaderboard);
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint to claim a referral mission reward
router.post("/claim-referral-reward", async (req, res) => {
  const { walletAddress, missionId, pointsToAdd } = req.body;

  if (!walletAddress || missionId === undefined || pointsToAdd === undefined) {
    return res.status(400).json({ error: "walletAddress, missionId, and pointsToAdd are required" });
  }

  try {
    let user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if mission is already claimed
    if (user.claimedMissions && user.claimedMissions.includes(missionId)) {
      return res.status(400).json({ error: "Mission already claimed" });
    }

    // For mission ID 1 (refer 1 friend), check if user has at least 1 referral
    if (missionId === 1 && user.referrals < 1) {
      return res.status(400).json({ error: "You need at least 1 referral to claim this reward" });
    }

    // For mission ID 2 (refer 5 friends), check if user has at least 5 referrals
    if (missionId === 2 && user.referrals < 5) {
      return res.status(400).json({ error: "You need at least 5 referrals to claim this reward" });
    }

    // For mission ID 3 (refer 10 friends), check if user has at least 10 referrals
    if (missionId === 3 && user.referrals < 10) {
      return res.status(400).json({ error: "You need at least 10 referrals to claim this reward" });
    }

    // Add points and mark mission as claimed
    user.points += pointsToAdd;
    
    // Initialize claimedMissions array if it doesn't exist
    if (!user.claimedMissions) {
      user.claimedMissions = [];
    }
    
    user.claimedMissions.push(missionId);

    // Initialize activity log if it doesn't exist
    if (!user.activityLog) {
      user.activityLog = [];
    }

    // Add to activity log
    user.activityLog.push({
      action: `Claimed referral mission #${missionId}`,
      activity: `Claimed referral mission #${missionId}`, // For compatibility with different log formats
      points: pointsToAdd,
      timestamp: new Date()
    });

    await user.save();

    res.json({ 
      message: "Reward claimed successfully!", 
      pointsEarned: pointsToAdd,
      newTotalPoints: user.points,
      claimedMissions: user.claimedMissions
    });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint to check if a mission is already claimed
router.get("/check-mission-claimed/:walletAddress/:missionId", async (req, res) => {
  const { walletAddress, missionId } = req.params;

  if (!walletAddress || !missionId) {
    return res.status(400).json({ error: "walletAddress and missionId are required" });
  }

  try {
    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if mission is claimed
    const claimed = user.claimedMissions && user.claimedMissions.includes(Number(missionId));

    res.json({ claimed });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ADMIN ROUTES

// Get all users (admin only)
router.get("/admin/all-users", isAdmin, async (req, res) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } }).sort({ points: -1 });
    
    // Add task completion stats to each user
    const usersWithStats = users.map(user => {
      const userObj = user.toObject();
      
      // Count completed tasks
      const completedTasksCount = user.taskProgress ? 
        user.taskProgress.filter(task => task.status === 'completed').length : 0;
      
      userObj.completedTasksCount = completedTasksCount;
      
      return userObj;
    });
    
    res.json(usersWithStats);
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Update user (admin only)
router.post("/admin/update-user", isAdmin, async (req, res) => {
  const { walletAddress, points, quizzesCompleted, referrals } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: "walletAddress is required" });
  }

  try {
    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user fields
    if (points !== undefined) user.points = points;
    if (quizzesCompleted !== undefined) user.quizzesCompleted = quizzesCompleted;
    if (referrals !== undefined) user.referrals = referrals;

    await user.save();
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete user (admin only)
router.delete("/admin/delete-user/:walletAddress", isAdmin, async (req, res) => {
  const { walletAddress } = req.params;

  if (!walletAddress) {
    return res.status(400).json({ error: "walletAddress is required" });
  }

  try {
    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Soft delete by setting isDeleted flag
    user.isDeleted = true;
    await user.save();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;