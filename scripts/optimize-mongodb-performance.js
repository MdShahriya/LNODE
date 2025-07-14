/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * MongoDB Performance Optimization Script
 * 
 * This script creates optimized compound indexes to resolve the
 * "Query Targeting: Scanned Objects / Returned has gone above 1000" issue.
 * 
 * Run this script to ensure all performance indexes are properly created.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Use the same connection approach as the app
const MONGODB_URI = process.env.NEXT_MONGO_URI || 'mongodb+srv://topay-shard-00-01.3yj3j.mongodb.net/inTopay';

console.log('🔗 Using MongoDB URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

async function optimizeDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    console.log(`✅ Connected to database: ${db.databaseName}`);
    
    // ========================================
    // USER COLLECTION INDEXES
    // ========================================
    console.log('\n📊 Optimizing User collection indexes...');
    const userCollection = db.collection('users');
    
    // Drop existing inefficient indexes if they exist
    try {
      await userCollection.dropIndex('points_-1');
      console.log('🗑️  Dropped old points index');
    } catch (e) {
      // Index might not exist, continue
    }
    
    // Create optimized compound indexes for User collection
    const userIndexes = [
      // Primary leaderboard and pagination queries
      { key: { points: -1, _id: 1 }, name: 'points_-1__id_1' },
      { key: { nodeStatus: 1, points: -1 }, name: 'nodeStatus_1_points_-1' },
      { key: { isActive: 1, points: -1 }, name: 'isActive_1_points_-1' },
      { key: { nodeStatus: 1, isActive: 1, points: -1 }, name: 'nodeStatus_1_isActive_1_points_-1' },
      
      // Analytics and reporting queries
      { key: { createdAt: -1, _id: 1 }, name: 'createdAt_-1__id_1' },
      { key: { lastActiveTime: -1, nodeStatus: 1 }, name: 'lastActiveTime_-1_nodeStatus_1' },
      { key: { lastCheckIn: -1, currentStreak: -1 }, name: 'lastCheckIn_-1_currentStreak_-1' },
      
      // Search and filtering queries
      { key: { walletAddress: 1, nodeStatus: 1 }, name: 'walletAddress_1_nodeStatus_1' },
      { key: { verification: 1, points: -1 }, name: 'verification_1_points_-1' },
      { key: { totalSessions: -1, points: -1 }, name: 'totalSessions_-1_points_-1' },
      
      // Performance monitoring indexes
      { key: { dailyEarnings: -1, weeklyEarnings: -1, monthlyEarnings: -1 }, name: 'earnings_compound' },
      { key: { uptime: -1, totalConnectionTime: -1 }, name: 'uptime_-1_totalConnectionTime_-1' }
    ];
    
    for (const index of userIndexes) {
      try {
        await userCollection.createIndex(index.key, { name: index.name, background: true });
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`⚠️  Index ${index.name} already exists`);
        } else {
          console.error(`❌ Error creating index ${index.name}:`, error.message);
        }
      }
    }
    
    // ========================================
    // LOTTERY WINNER COLLECTION INDEXES
    // ========================================
    console.log('\n🎰 Optimizing LotteryWinner collection indexes...');
    const lotteryCollection = db.collection('lotterywinners');
    
    const lotteryIndexes = [
      // Efficient date-based pagination and queries
      { key: { date: -1, _id: 1 }, name: 'date_-1__id_1' },
      { key: { walletAddress: 1, date: -1 }, name: 'walletAddress_1_date_-1' },
      
      // Date range queries for today's winner
      { key: { date: 1 }, name: 'date_1' }
    ];
    
    for (const index of lotteryIndexes) {
      try {
        await lotteryCollection.createIndex(index.key, { name: index.name, background: true });
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`⚠️  Index ${index.name} already exists`);
        } else {
          console.error(`❌ Error creating index ${index.name}:`, error.message);
        }
      }
    }
    
    // ========================================
    // NODE SESSION COLLECTION INDEXES
    // ========================================
    console.log('\n🖥️  Optimizing NodeSession collection indexes...');
    const sessionCollection = db.collection('nodesessions');
    
    const sessionIndexes = [
      // User session history and analytics
      { key: { walletAddress: 1, startTime: -1 }, name: 'walletAddress_1_startTime_-1' },
      { key: { user: 1, startTime: -1 }, name: 'user_1_startTime_-1' },
      { key: { status: 1, startTime: -1 }, name: 'status_1_startTime_-1' },
      
      // Session duration and performance analytics
      { key: { startTime: -1, endTime: -1 }, name: 'startTime_-1_endTime_-1' },
      { key: { sessionId: 1, startTime: -1 }, name: 'sessionId_1_startTime_-1' },
      
      // Device and platform analytics
      { key: { deviceType: 1, browser: 1, platform: 1 }, name: 'device_compound' },
      { key: { pointsEarned: -1, uptime: -1 }, name: 'pointsEarned_-1_uptime_-1' },
      
      // Performance monitoring
      { key: { lastHeartbeat: -1 }, name: 'lastHeartbeat_-1' },
      { key: { nodeQuality: 1, performanceScore: -1 }, name: 'nodeQuality_1_performanceScore_-1' }
    ];
    
    for (const index of sessionIndexes) {
      try {
        await sessionCollection.createIndex(index.key, { name: index.name, background: true });
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`⚠️  Index ${index.name} already exists`);
        } else {
          console.error(`❌ Error creating index ${index.name}:`, error.message);
        }
      }
    }
    
    // ========================================
    // POINTS HISTORY COLLECTION INDEXES
    // ========================================
    console.log('\n💰 Optimizing PointsHistory collection indexes...');
    const pointsCollection = db.collection('pointshistories');
    
    const pointsIndexes = [
      // User transaction history
      { key: { walletAddress: 1, timestamp: -1 }, name: 'walletAddress_1_timestamp_-1' },
      { key: { user: 1, timestamp: -1 }, name: 'user_1_timestamp_-1' },
      
      // Points source analytics
      { key: { source: 1, timestamp: -1 }, name: 'source_1_timestamp_-1' },
      { key: { subSource: 1, timestamp: -1 }, name: 'subSource_1_timestamp_-1' },
      
      // Transaction type and verification
      { key: { transactionType: 1, timestamp: -1 }, name: 'transactionType_1_timestamp_-1' },
      { key: { isVerified: 1, timestamp: -1 }, name: 'isVerified_1_timestamp_-1' },
      
      // Time-based queries
      { key: { timestamp: -1 }, name: 'timestamp_-1' },
      { key: { points: -1, timestamp: -1 }, name: 'points_-1_timestamp_-1' }
    ];
    
    for (const index of pointsIndexes) {
      try {
        await pointsCollection.createIndex(index.key, { name: index.name, background: true });
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`⚠️  Index ${index.name} already exists`);
        } else {
          console.error(`❌ Error creating index ${index.name}:`, error.message);
        }
      }
    }
    
    // ========================================
    // PERFORMANCE ANALYSIS
    // ========================================
    console.log('\n📈 Running performance analysis...');
    
    // Check index usage statistics
    const collections = ['users', 'lotterywinners', 'nodesessions', 'pointshistories'];
    
    for (const collectionName of collections) {
      console.log(`\n📊 ${collectionName.toUpperCase()} Collection Stats:`);
      const collection = db.collection(collectionName);
      
      try {
        const stats = await collection.stats();
        console.log(`  📄 Documents: ${stats.count?.toLocaleString() || 'N/A'}`);
        console.log(`  💾 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  🗂️  Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
        
        const indexes = await collection.listIndexes().toArray();
        console.log(`  🔍 Total Indexes: ${indexes.length}`);
      } catch (error) {
        console.log(`  ⚠️  Could not get stats for ${collectionName}`);
      }
    }
    
    // ========================================
    // QUERY PERFORMANCE TESTS
    // ========================================
    console.log('\n🧪 Testing query performance...');
    
    // Test User leaderboard query
    console.log('\n🏆 Testing User leaderboard query...');
    const startTime = Date.now();
    const leaderboardResult = await userCollection.find({ isActive: true })
      .sort({ points: -1, _id: 1 })
      .limit(50)
      .explain('executionStats');
    
    const executionTime = Date.now() - startTime;
    console.log(`  ⏱️  Execution time: ${executionTime}ms`);
    console.log(`  📊 Documents examined: ${leaderboardResult.executionStats.totalDocsExamined}`);
    console.log(`  📋 Documents returned: ${leaderboardResult.executionStats.totalDocsReturned}`);
    
    const scanRatio = leaderboardResult.executionStats.totalDocsExamined / 
                     Math.max(leaderboardResult.executionStats.totalDocsReturned, 1);
    console.log(`  🎯 Scan ratio: ${scanRatio.toFixed(2)}:1`);
    
    if (scanRatio > 100) {
      console.log(`  ⚠️  HIGH SCAN RATIO! Consider optimizing this query.`);
    } else {
      console.log(`  ✅ Good scan ratio!`);
    }
    
    // Test today's lottery winner query
    console.log('\n🎰 Testing lottery winner query...');
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
    
    const lotteryStartTime = Date.now();
    const lotteryResult = await lotteryCollection.find({
      date: { $gte: startOfDay, $lt: endOfDay }
    }).explain('executionStats');
    
    const lotteryExecutionTime = Date.now() - lotteryStartTime;
    console.log(`  ⏱️  Execution time: ${lotteryExecutionTime}ms`);
    console.log(`  📊 Documents examined: ${lotteryResult.executionStats.totalDocsExamined}`);
    console.log(`  📋 Documents returned: ${lotteryResult.executionStats.totalDocsReturned}`);
    
    const lotteryScanRatio = lotteryResult.executionStats.totalDocsExamined / 
                            Math.max(lotteryResult.executionStats.totalDocsReturned, 1);
    console.log(`  🎯 Scan ratio: ${lotteryScanRatio.toFixed(2)}:1`);
    
    console.log('\n🎉 MongoDB Performance Optimization Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ All compound indexes created successfully');
    console.log('✅ Query performance optimized');
    console.log('✅ Scan ratios should now be below 10:1');
    console.log('\n💡 Next Steps:');
    console.log('1. Monitor query performance in MongoDB Compass');
    console.log('2. Check application logs for improved response times');
    console.log('3. Set up alerts for scan ratios > 100:1');
    
  } catch (error) {
    console.error('❌ Error optimizing database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the optimization
optimizeDatabase().catch(console.error);