import mongoose from 'mongoose';

// Get MongoDB URI from environment variables with fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/topay';

// Global variable to track connection status
let isConnected = false;

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
export async function connectDB(): Promise<void> {
  // If already connected, return early
  if (isConnected) {
    return;
  }

  // If mongoose is already connected, set isConnected and return
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  try {
    // Set strict query mode for Mongoose to prevent unknown field queries
    mongoose.set('strictQuery', true);

    // Connect to the MongoDB database
    await mongoose.connect(MONGODB_URI);

    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    isConnected = false;
    throw new Error('Failed to connect to the database');
  }
}