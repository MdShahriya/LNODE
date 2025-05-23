import mongoose from 'mongoose';

const MONGODB_URI = process.env.NEXT_MONGO_URI || '';

// Get the MongooseCache type from global declaration
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<{ conn: typeof mongoose; promise: Promise<unknown> | null }> | null;
};

// Access the mongoose property from the properly typed global object
let cached: MongooseCache = (global as unknown as { mongoose: MongooseCache }).mongoose;

if (!cached) {
  cached = (global as unknown as { mongoose: MongooseCache }).mongoose = { conn: null, promise: null };
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn as typeof mongoose;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return { conn: mongooseInstance, promise: cached.promise };
    });
  }

  try {
    const result = await cached.promise;
    cached.conn = result.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn as typeof mongoose;
}

export default connectDB;