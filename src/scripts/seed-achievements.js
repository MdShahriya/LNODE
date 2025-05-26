// Script to seed initial achievements in the database
import pkg from 'mongoose';
const { connect, Schema, models, model, connection } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// Connect to MongoDB
connect(process.env.NEXT_MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Achievement Schema
const AchievementSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reward: {
      type: Number,
      required: true,
    },
    target: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Create Achievement model
const Achievement = models.Achievement || model('Achievement', AchievementSchema);

// Initial achievements data
const initialAchievements = [
  
  {
    title: 'Daily Streak Starter',
    description: 'Log in for 3 consecutive days',
    reward: 1500,
    target: 3,
    isActive: true
  },
  
  {
    title: 'Daily Streak Starter',
    description: 'Log in for 7 consecutive days',
    reward: 3500,
    target: 3,
    isActive: true
  },
  {
    title: 'Node Master',
    description: 'Maintain node uptime for 360000 seconds / 100 hours',
    reward: 5000,
    target: 360000, // 100 hours in seconds
    isActive: true
  },
  {
    title: 'First Task Complete',
    description: 'Complete your first task',
    reward: 1000,
    target: 1,
    isActive: true
  },
  {
    title: 'Task Champion',
    description: 'Complete 50 tasks',
    reward: 10000,
    target: 50,
    isActive: true
  },
  {
    title: 'Point Collector',
    description: 'Earn 500000 points',
    reward: 50000,
    target: 500000,
    isActive: true
  },
  {
    title: 'Social Butterfly',
    description: 'Refer 5 new users',
    reward: 3500,
    target: 5,
    isActive: true
  },
  {
    title: 'Community Builder',
    description: 'Refer 10 new users',
    reward: 7500,
    target: 10,
    isActive: true
  },
  {
    title: 'Network Guru',
    description: 'Refer 25 new users',
    reward: 20000,
    target: 25,
    isActive: true
  }
];

// Seed function
async function seedAchievements() {
  try {
    // Clear existing achievements
    await Achievement.deleteMany({});
    console.log('Cleared existing achievements');

    // Insert new achievements
    const result = await Achievement.insertMany(initialAchievements);
    console.log(`Seeded ${result.length} achievements`);

    // Close connection
    connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding achievements:', error);
    connection.close();
  }
}

// Run the seed function
seedAchievements();