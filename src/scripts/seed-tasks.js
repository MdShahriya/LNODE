// This script seeds the database with initial tasks
import dotenv from 'dotenv';
dotenv.config();
import { Schema, model, connect, disconnect } from 'mongoose';

// Define Task schema directly in this script
const TaskSchema = new Schema(
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
      tokens: {
        type: Number,
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
  },
  { timestamps: true }
);

// Create Task model
const Task = model('Task', TaskSchema);

// Connect to MongoDB
connect(process.env.NEXT_MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Initial tasks data
const initialTasks = [
  {
    title: 'Maintain Node Uptime',
    description: 'Keep your node running for 24 hours straight to earn points and tokens.',
    rewards: {
      points: 100,
      tokens: 10,
    },
    requirements: ['Node must be active', 'Wallet must be connected'],
    isActive: true,
  },
  {
    title: 'Complete Profile',
    description: 'Fill out all profile information to earn points.',
    rewards: {
      points: 50,
    },
    requirements: ['Wallet connection'],
    isActive: true,
  },
  {
    title: 'Refer a Friend',
    description: 'Invite a friend to join the TOPAY network and earn points when they sign up.',
    rewards: {
      points: 200,
      tokens: 20,
    },
    requirements: ['Friend must sign up using your referral link', 'Friend must connect wallet'],
    isActive: true,
  },
  {
    title: 'Join Discord Community',
    description: 'Join our Discord community to stay updated and earn points.',
    rewards: {
      points: 75,
    },
    requirements: ['Must verify Discord account'],
    isActive: true,
  },
  {
    title: 'Follow on Social Media',
    description: 'Follow TOPAY on Twitter and other social media platforms.',
    rewards: {
      points: 50,
    },
    requirements: ['Must follow official accounts'],
    isActive: true,
  },
];

// Seed tasks
async function seedTasks() {
  try {
    // Clear existing tasks
    await Task.deleteMany({});
    console.log('Cleared existing tasks');

    // Insert new tasks
    const createdTasks = await Task.insertMany(initialTasks);
    console.log(`${createdTasks.length} tasks created:`);

    // Log created tasks
    createdTasks.forEach((task) => {
      console.log(`- ${task.title}`);
    });

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Disconnect from MongoDB
    disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the seeding function
seedTasks();