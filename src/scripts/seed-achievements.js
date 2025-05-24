// Script to seed initial achievements in the database
import { connect, Schema, models, model, connection } from 'mongoose';
import {dotenv} from 'dotenv';
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
    title: 'Node Master',
    description: 'Maintain node uptime for 100 hours',
    reward: 500,
    target: 100,
    isActive: true
  },
  {
    title: 'Task Champion',
    description: 'Complete 50 tasks',
    reward: 1000,
    target: 50,
    isActive: true
  },
  {
    title: 'Point Collector',
    description: 'Earn 5000 points',
    reward: 750,
    target: 5000,
    isActive: true
  },
  {
    title: 'Community Builder',
    description: 'Refer 10 new users',
    reward: 750,
    target: 10,
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