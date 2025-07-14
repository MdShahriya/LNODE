/* eslint-disable @typescript-eslint/no-require-imports */
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');

// Define the LotteryWinner schema directly in the script
const LotteryWinnerSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    walletAddress: {
      type: String,
      required: true,
      index: true
    },
    username: {
      type: String,
      default: null
    },
    prize: {
      type: Number,
      required: true,
      default: 40
    }
  },
  { timestamps: true }
);

// Compound indexes
LotteryWinnerSchema.index({ date: -1, _id: 1 });
LotteryWinnerSchema.index({ walletAddress: 1, date: -1 });

const LotteryWinner = mongoose.models.LotteryWinner || mongoose.model('LotteryWinner', LotteryWinnerSchema);

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.NEXT_MONGO_URI || 'mongodb://localhost:27017/topay-dashboard';

async function createTestWinner() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a test lottery winner for today (using UTC to match API logic)
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    
    // Check if there's already a winner for today
    const existingTodayWinner = await LotteryWinner.findOne({
      date: {
        $gte: todayUTC,
        $lt: new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (existingTodayWinner) {
      console.log('A winner for today already exists:', {
        id: existingTodayWinner._id,
        username: existingTodayWinner.username,
        walletAddress: existingTodayWinner.walletAddress,
        date: existingTodayWinner.date
      });
      return;
    }
    
    const testWinner = new LotteryWinner({
       date: todayUTC,
       walletAddress: '0x1234567890123456789012345678901234567890',
       username: 'TodaysWinner',
       prize: 40
     });

    // Save the test winner
    await testWinner.save();
    console.log('Test lottery winner created successfully!');
    console.log('Winner details:', {
      id: testWinner._id,
      date: testWinner.date,
      walletAddress: testWinner.walletAddress,
      username: testWinner.username,
      prize: testWinner.prize
    });

    // Check if there are any lottery winners in the database
    const allWinners = await LotteryWinner.find().sort({ date: -1 }).limit(5);
    console.log(`\nTotal lottery winners in database: ${allWinners.length}`);
    
    if (allWinners.length > 0) {
      console.log('Recent winners:');
      allWinners.forEach((winner, index) => {
        console.log(`${index + 1}. ${winner.username} - ${winner.walletAddress.slice(0, 8)}... - $${winner.prize} - ${winner.date}`);
      });
    }

  } catch (error) {
    console.error('Error creating test winner:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
createTestWinner();