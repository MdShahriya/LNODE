import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/Task';

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
      points: 500,
    },
    requirements: [
      'Wallet connection',
      'Username',
      'Email',
      'Verification (optional)'
    ],
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

// POST /api/tasks/seed - Seed the database with initial tasks
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Check if there's a secret key in the query params for basic security
    const secretKey = request.nextUrl.searchParams.get('key');
    
    if (secretKey !== 'topay-admin-seed') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Clear existing tasks
    await Task.deleteMany({});
    
    // Insert new tasks
    const createdTasks = await Task.insertMany(initialTasks);
    
    return NextResponse.json({ 
      success: true, 
      message: `${createdTasks.length} tasks created successfully`,
      tasks: createdTasks
    });
  } catch (error) {
    console.error('Error seeding tasks:', error);
    return NextResponse.json({ error: 'Failed to seed tasks' }, { status: 500 });
  }
}