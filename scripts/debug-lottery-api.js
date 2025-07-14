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

const LotteryWinner = mongoose.models.LotteryWinner || mongoose.model('LotteryWinner', LotteryWinnerSchema);

// MongoDB connection string
const MONGODB_URI = process.env.NEXT_MONGO_URI || 'mongodb://localhost:27017/topay-dashboard';

async function debugLotteryAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get today's date range in UTC (same logic as API)
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
    
    console.log('\n=== DEBUG INFO ===');
    console.log('Current time:', today.toISOString());
    console.log('Start of day (UTC):', startOfDay.toISOString());
    console.log('End of day (UTC):', endOfDay.toISOString());
    
    // Check all winners in database
    const allWinners = await LotteryWinner.find().sort({ date: -1 });
    console.log('\nAll winners in database:');
    allWinners.forEach((winner, index) => {
      console.log(`${index + 1}. ${winner.username} - Date: ${winner.date.toISOString()} - Prize: $${winner.prize}`);
    });
    
    // Test the exact same query as the API
    const todaysWinners = await LotteryWinner.find({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ date: -1 });
    
    console.log('\nToday\'s winners (API query):');
    if (todaysWinners.length === 0) {
      console.log('No winners found for today with the API query!');
      
      // Check if any winner dates fall within today's range
      console.log('\nChecking if any winner dates match today\'s range:');
      allWinners.forEach((winner, index) => {
        const winnerDate = new Date(winner.date);
        const isInRange = winnerDate >= startOfDay && winnerDate < endOfDay;
        console.log(`${index + 1}. ${winner.username} - ${winnerDate.toISOString()} - In range: ${isInRange}`);
      });
    } else {
      todaysWinners.forEach((winner, index) => {
        console.log(`${index + 1}. ${winner.username} - ${winner.date.toISOString()} - Prize: $${winner.prize}`);
      });
    }
    
    // Test the aggregation pipeline (same as API)
    const pipeline = [
      {
        $match: {
          date: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        }
      },
      { $sort: { date: -1, _id: 1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          date: 1,
          walletAddress: 1,
          username: 1,
          prize: 1
        }
      }
    ];
    
    const aggregationResult = await LotteryWinner.aggregate(pipeline);
    console.log('\nAggregation result (same as API):');
    if (aggregationResult.length === 0) {
      console.log('No results from aggregation!');
    } else {
      aggregationResult.forEach((winner, index) => {
        console.log(`${index + 1}. ${winner.username} - ${winner.date.toISOString()} - Prize: $${winner.prize}`);
      });
    }

  } catch (error) {
    console.error('Error debugging lottery API:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
debugLotteryAPI();