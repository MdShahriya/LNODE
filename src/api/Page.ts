import axios from 'axios';

// Define the base URLs for API requests
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users` : '/api/users';
const API_TASKS_URL = process.env.NEXT_PUBLIC_BACKEND_URL ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tasks` : '/api/tasks';

// Define types for better type safety
export interface UserStats {
  activityLog: never[];
  walletAddress: string;
  points: number;
  quizzesCompleted: number;
  referrals: number;
  canTakeQuiz: boolean;
  claimedMissions: number[];
  completedTasksCount: number;
}

export interface Task {
  _id: string;
  taskNumber: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: string | null;
  points: number;
  taskLink?: string;
  profileImage?: string;
  userProgress?: {
    status: 'pending' | 'in-progress' | 'verified' | 'completed';
    startedAt?: string;
    verifiedAt?: string;
  };
  completedAt?: string;
  pointsEarned?: number;
}

export interface TaskResponse {
  data: Task[];
}

// Define a custom error interface for API errors
export interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
    status?: number;
  };
  message: string;
}

// Function to login user by wallet address and handle referral
export const loginUser = async (walletAddress: string) => {
  try {
    // Capture the referral logic within the login call
    const queryParams = new URLSearchParams(window.location.search);
    const referrer = queryParams.get("ref"); // Check if there's a referral in the URL

    // Make the login request, passing the referrer (if present) to the backend
    const response = await axios.post(`${API_BASE_URL}/login`, { walletAddress, referrer });

    return response.data;
  } catch (error) {
    console.error("Login failed", error);
    throw new Error('Login failed');
  }
};

// Function to fetch user stats
export const getUserStats = async (walletAddress: string): Promise<UserStats> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/get-user/${walletAddress}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch stats", error);
    throw new Error('Failed to fetch stats');
  }
};

// Function to update points and quizzes completed
export const addPoints = async (walletAddress: string, points: number) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/add-points`, {
      walletAddress,
      pointsToAdd: points
    });
    return response.data;
  } catch (error) {
    console.error("Failed to update points", error);
    throw new Error('Failed to update points');
  }
};

// Function to fetch leaderboard data
export const getLeaderboard = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/leaderboard`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch leaderboard", error);
    throw new Error('Failed to fetch leaderboard');
  }
};

// Function to claim a referral mission reward
export const claimReferralReward = async (walletAddress: string, missionId: number, pointsToAdd: number) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/claim-referral-reward`, {
      walletAddress,
      missionId,
      pointsToAdd
    });
    return response.data;
  } catch (error) {
    console.error("Failed to claim referral reward", error);
    throw new Error('Failed to claim referral reward');
  }
};

// Function to check if a mission is already claimed
export const checkMissionClaimed = async (walletAddress: string, missionId: number) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/check-mission-claimed/${walletAddress}/${missionId}`);
    return response.data.claimed;
  } catch (error) {
    console.error("Failed to check mission status", error);
    throw new Error('Failed to check mission status');
  }
};

// Task Management Functions

// Function to get all tasks (admin only)
export const getTasks = async () => {
  try {
    const adminWalletAddress = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null;
    const response = await axios.get(`${API_TASKS_URL}`, {
      headers: {
        'X-Wallet-Address': adminWalletAddress
      }
    });
    return response;
  } catch (error) {
    console.error("Failed to fetch tasks", error);
    throw new Error('Failed to fetch tasks');
  }
};

// Function to update user points and other stats (admin only)
export const updateUserPoints = async (walletAddress: string, userData: {
  points: number;
  quizzesCompleted: number;
  referrals: number;
}) => {
  try {
    // Add admin wallet address to headers for authorization
    const adminWalletAddress = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null;
    const response = await axios.post(`${API_BASE_URL}/admin/update-user`, {
      walletAddress,
      ...userData
    }, {
      headers: {
        adminWalletAddress
      }
    });
    return response.data;
  } catch (error) {
    console.error("Failed to update user data", error);
    throw new Error('Failed to update user data');
  }
};

// Function to delete a user (admin only)
export const deleteUser = async (walletAddress: string) => {
  try {
    // Add admin wallet address to headers for authorization
    const adminWalletAddress = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null;
    const response = await axios.delete(`${API_BASE_URL}/admin/delete-user/${walletAddress}`, {
      headers: {
        adminWalletAddress
      }
    });
    return response.data;
  } catch (error) {
    console.error("Failed to delete user", error);
    throw new Error('Failed to delete user');
  }
};

// Function to get all users (admin only)
export const getAllUsers = async () => {
  try {
    // Add admin wallet address to headers for authorization
    const adminWalletAddress = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null;
    const response = await axios.get(`${API_BASE_URL}/admin/all-users`, {
      headers: {
        adminWalletAddress
      }
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch all users", error);
    throw new Error('Failed to fetch all users');
  }
};