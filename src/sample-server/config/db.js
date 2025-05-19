import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log("\x1b[32m%s\x1b[0m", "✅ MongoDB Connected:");
    console.log("\x1b[34m%s\x1b[0m", `   → Database: ${conn.connection.name}`);
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "❌ [DATABASE ERROR] Connection failed:");
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;
