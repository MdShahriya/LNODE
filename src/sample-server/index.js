import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js"; // Import task routes
import quizRoutes from "./routes/quizRoutes.js"; // Import quiz routes
import rateLimit from "express-rate-limit"; // Import rate limiter
import helmet from "helmet"; // Import helmet for security headers


dotenv.config();
connectDB();


const app = express();


// Security middleware
app.use(helmet()); // Add security headers


// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes"
});


// Apply rate limiting to all routes
app.use(apiLimiter);


// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());  // ✅ Parses incoming JSON requests
app.use(express.json());     // ✅ Ensures Express handles JSON correctly

// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes); // Add task routes
app.use("/api/quiz", quizRoutes); // Add quiz routes


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));