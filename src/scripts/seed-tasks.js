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
        validator: function(v) {
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
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
    description: 'Keep your node running for 24 hours straight to earn points.',
    rewards: {
      points: 100,
    },
    requirements: ['Node must be active', 'Wallet must be connected'],
    isActive: true,
    verificationMethod: {
      type: 'auto',
      apiEndpoint: '/api/node/uptime-check',
      apiMethod: 'GET'
    }
  },
  {
    title: 'Complete Profile',
    description: 'Complete your profile by adding username, email, and verification details to earn rewards.',
    rewards: {
      points: 500,
    },
    requirements: ['Wallet Connection', 'Username', 'Email', 'Verification (optional)'],
    isActive: true,
    verificationMethod: {
      type: 'auto',
      apiEndpoint: '/api/user/profile-completion',
      apiMethod: 'GET'
    }
  },
  {
    title: 'Refer a Friend',
    description: 'Invite a friend to join the TOPAY network and earn points when they sign up.',
    rewards: {
      points: 200,
    },
    requirements: ['Friend must sign up using your referral link', 'Friend must connect wallet'],
    isActive: true,
    verificationMethod: {
      type: 'auto',
      apiEndpoint: '/api/referral/verify',
      apiMethod: 'GET'
    }
  },
  {
    title: 'Join Discord Community',
    description: 'Join our Discord community to stay updated and earn points.',
    rewards: {
      points: 75,
    },
    requirements: ['Must verify Discord account'],
    isActive: true,
    verificationMethod: {
      type: 'auto',
      apiEndpoint: '/api/discord/verify',
      apiMethod: 'GET'
    }
  },
  {
    title: 'Follow on Tweeter/X',
    description: 'Follow TOPAY on Twitter and other social media platforms.',
    rewards: {
      points: 50,
    },
    requirements: ['Must follow official account'],
    isActive: true,
    verificationMethod: {
      type: 'auto',
      apiEndpoint: '/api/social/verify',
      apiMethod: 'GET'
    }
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