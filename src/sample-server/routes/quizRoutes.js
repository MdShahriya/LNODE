import express from 'express';
import QuizQuestion from '../models/QuizQuestion.js';
import User from '../models/user.js';

const router = express.Router();

// Admin wallet addresses
const ADMIN_ADDRESSES = ["0x9841adF197F21fE9a299312da8EF2C47f83c4e89"
];

// Middleware to check if the user is an admin
const isAdmin = async (req, res, next) => {
  try {
    // Get admin wallet address from headers
    const adminWalletAddress = req.headers['x-wallet-address'] || req.headers.adminwalletaddress;
    
    if (!adminWalletAddress) {
      return res.status(401).json({ error: 'Admin wallet address is required' });
    }
    
    // Check if the wallet address is in the admin list
    const isAdminWallet = ADMIN_ADDRESSES.some(
      admin => admin.toLowerCase() === adminWalletAddress.toLowerCase()
    );
    
    if (!isAdminWallet) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    
    // If admin, proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Get all quiz questions
router.get('/', async (req, res) => {
  try {
    const questions = await QuizQuestion.find().sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    res.status(500).json({ error: 'Failed to fetch quiz questions' });
  }
});

// Get random quiz questions
router.get('/random', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 10;
    const questions = await QuizQuestion.aggregate([
      { $sample: { size: count } }
    ]);
    res.json(questions);
  } catch (error) {
    console.error('Error fetching random quiz questions:', error);
    res.status(500).json({ error: 'Failed to fetch random quiz questions' });
  }
});

// Check if a user can take a quiz today - MOVED BEFORE /:id ROUTE
router.get('/eligibility/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await User.findOne({ walletAddress });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has taken a quiz in the last 24 hours
    const lastQuizDate = user.lastQuizDate || new Date(0);
    const now = new Date();
    const hoursSinceLastQuiz = (now - lastQuizDate) / (1000 * 60 * 60);
    
    res.json({
      canTakeQuiz: hoursSinceLastQuiz >= 24,
      hoursRemaining: Math.max(0, 24 - hoursSinceLastQuiz)
    });
  } catch (error) {
    console.error('Error checking quiz eligibility:', error);
    res.status(500).json({ error: 'Failed to check quiz eligibility' });
  }
});

// Record quiz completion and award points
router.post('/complete', async (req, res) => {
  try {
    const { walletAddress, score, totalQuestions } = req.body;
    
    if (!walletAddress || score === undefined || !totalQuestions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await User.findOne({ walletAddress });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user stats
    user.points += score;
    user.quizzesCompleted += 1;
    user.lastQuizDate = new Date();
    
    // Add to activity log
    user.activityLog.push({
      activity: 'Completed quiz',
      points: score,
      timestamp: new Date()
    });
    
    await user.save();
    
    res.json({
      message: 'Quiz completed successfully',
      pointsEarned: score,
      totalPoints: user.points
    });
  } catch (error) {
    console.error('Error recording quiz completion:', error);
    res.status(500).json({ error: 'Failed to record quiz completion' });
  }
});

// Get a specific quiz question by ID - MOVED AFTER SPECIFIC ROUTES
router.get('/:id', async (req, res) => {
  try {
    const question = await QuizQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Quiz question not found' });
    }
    res.json(question);
  } catch (error) {
    console.error('Error fetching quiz question:', error);
    res.status(500).json({ error: 'Failed to fetch quiz question' });
  }
});

// Create a new quiz question (admin only)
router.post('/', isAdmin, async (req, res) => {
  try {
    const { question, options, answer, category, difficulty } = req.body;
    
    if (!question || !options || answer === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate answer is within options range
    if (answer < 0 || answer >= options.length) {
      return res.status(400).json({ error: 'Answer index must be valid' });
    }
    
    const newQuestion = new QuizQuestion({
      question,
      options,
      answer,
      ...(category && { category }),
      ...(difficulty && { difficulty })
    });
    
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    console.error('Error creating quiz question:', error.message);
    res.status(500).json({ 
      error: 'Failed to create quiz question',
      message: error.message 
    });
  }
});

// Update a quiz question (admin only)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    console.log('Update request received for quiz question:', req.params.id);
    console.log('Request body:', req.body);
    
    const { question, options, answer, category, difficulty } = req.body;
    
    // Validate required fields
    if (!question || !options || answer === undefined) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Question, options, and answer are required'
      });
    }
    
    // Validate options array
    if (!Array.isArray(options) || options.length < 2) {
      console.log('Validation failed: Options must be an array with at least 2 items');
      return res.status(400).json({ 
        error: 'Invalid options',
        message: 'Options must be an array with at least 2 items'
      });
    }
    
    // Validate answer is within options range
    if (typeof answer !== 'number' || answer < 0 || answer >= options.length) {
      console.log('Validation failed: Answer index out of range');
      return res.status(400).json({ 
        error: 'Invalid answer',
        message: `Answer index must be a number between 0 and ${options.length - 1}`
      });
    }
    
    // Find the question first to make sure it exists
    const existingQuestion = await QuizQuestion.findById(req.params.id);
    if (!existingQuestion) {
      console.log('Quiz question not found:', req.params.id);
      return res.status(404).json({ 
        error: 'Quiz question not found',
        message: `No question found with ID: ${req.params.id}`
      });
    }
    
    // Create update object with explicit type conversion for answer
    const updateData = {
      question,
      options,
      answer: Number(answer) // Ensure answer is a number
    };
    
    // Add optional fields if they exist
    if (category !== undefined) updateData.category = category;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    
    console.log('Updating with data:', updateData);
    
    // Update using direct method instead of findByIdAndUpdate to avoid validation issues
    existingQuestion.question = updateData.question;
    existingQuestion.options = updateData.options;
    existingQuestion.answer = updateData.answer;
    if (category !== undefined) existingQuestion.category = category;
    if (difficulty !== undefined) existingQuestion.difficulty = difficulty;
    
    // Save with validation
    await existingQuestion.save();
    
    console.log('Question updated successfully:', existingQuestion);
    res.json(existingQuestion);
  } catch (error) {
    console.error('Error updating quiz question:', error);
    // Send more detailed error information
    res.status(500).json({ 
      error: 'Failed to update quiz question',
      message: error.message || 'Unknown server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete a quiz question (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const deletedQuestion = await QuizQuestion.findByIdAndDelete(req.params.id);
    
    if (!deletedQuestion) {
      return res.status(404).json({ error: 'Quiz question not found' });
    }
    
    res.json({ message: 'Quiz question deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz question:', error.message);
    res.status(500).json({ 
      error: 'Failed to delete quiz question',
      message: error.message 
    });
  }
});

export default router;