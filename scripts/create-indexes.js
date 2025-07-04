/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * MongoDB Index Creation Script
 * 
 * This script creates optimized indexes to resolve the "Query Targeting: Scanned Objects / Returned has gone above 1000" issue.
 * Run this script to ensure all necessary indexes are created for optimal query performance.
 * 
 * Usage:
 * node scripts/create-indexes.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function createIndexes() {
  const client = new MongoClient(process.env.NEXT_MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // User Collection Indexes
    console.log('Creating User collection indexes...');
    const userCollection = db.collection('users');
    
    await userCollection.createIndex({ walletAddress: 1 }, { unique: true });
    await userCollection.createIndex({ nodeStatus: 1 });
    await userCollection.createIndex({ isActive: 1 });
    await userCollection.createIndex({ lastActiveTime: -1 });
    await userCollection.createIndex({ lastCheckIn: -1 });
    await userCollection.createIndex({ referredBy: 1 });
    await userCollection.createIndex({ lastLoginTime: -1 });
    
    // Compound indexes for User collection
    await userCollection.createIndex({ points: -1, _id: 1 });
    await userCollection.createIndex({ nodeStatus: 1, points: -1 });
    await userCollection.createIndex({ isActive: 1, points: -1 });
    await userCollection.createIndex({ nodeStatus: 1, isActive: 1, points: -1 });
    await userCollection.createIndex({ createdAt: -1, _id: 1 });
    await userCollection.createIndex({ lastActiveTime: -1, nodeStatus: 1 });
    await userCollection.createIndex({ lastCheckIn: -1, currentStreak: -1 });
    await userCollection.createIndex({ walletAddress: 1, nodeStatus: 1 });
    await userCollection.createIndex({ verification: 1, points: -1 });
    await userCollection.createIndex({ totalSessions: -1, points: -1 });
    await userCollection.createIndex({ dailyEarnings: -1, weeklyEarnings: -1, monthlyEarnings: -1 });
    await userCollection.createIndex({ uptime: -1, totalConnectionTime: -1 });
    
    console.log('✅ User collection indexes created');
    
    // LotteryWinner Collection Indexes
    console.log('Creating LotteryWinner collection indexes...');
    const lotteryCollection = db.collection('lotterywinners');
    
    await lotteryCollection.createIndex({ date: 1 });
    await lotteryCollection.createIndex({ walletAddress: 1 });
    
    // Compound indexes for LotteryWinner collection
    await lotteryCollection.createIndex({ date: -1, _id: 1 });
    await lotteryCollection.createIndex({ walletAddress: 1, date: -1 });
    
    console.log('✅ LotteryWinner collection indexes created');
    
    // PointsHistory Collection Indexes
    console.log('Creating PointsHistory collection indexes...');
    const pointsCollection = db.collection('pointshistories');
    
    await pointsCollection.createIndex({ user: 1 });
    await pointsCollection.createIndex({ walletAddress: 1 });
    await pointsCollection.createIndex({ source: 1 });
    await pointsCollection.createIndex({ subSource: 1 });
    await pointsCollection.createIndex({ sessionId: 1 });
    await pointsCollection.createIndex({ taskId: 1 });
    await pointsCollection.createIndex({ achievementId: 1 });
    await pointsCollection.createIndex({ referralId: 1 });
    await pointsCollection.createIndex({ transactionType: 1 });
    await pointsCollection.createIndex({ isVerified: 1 });
    await pointsCollection.createIndex({ expiresAt: 1 });
    await pointsCollection.createIndex({ isExpired: 1 });
    await pointsCollection.createIndex({ timestamp: -1 });
    
    // Compound indexes for PointsHistory collection
    await pointsCollection.createIndex({ walletAddress: 1, timestamp: -1 });
    await pointsCollection.createIndex({ user: 1, timestamp: -1 });
    await pointsCollection.createIndex({ source: 1, timestamp: -1 });
    await pointsCollection.createIndex({ subSource: 1, timestamp: -1 });
    await pointsCollection.createIndex({ transactionType: 1, timestamp: -1 });
    await pointsCollection.createIndex({ isVerified: 1, timestamp: -1 });
    await pointsCollection.createIndex({ expiresAt: 1, isExpired: 1 });
    await pointsCollection.createIndex({ sessionId: 1, timestamp: -1 });
    await pointsCollection.createIndex({ taskId: 1, achievementId: 1 });
    await pointsCollection.createIndex({ points: -1, timestamp: -1 });
    await pointsCollection.createIndex({ balanceAfter: -1, timestamp: -1 });
    
    console.log('✅ PointsHistory collection indexes created');
    
    // NodeSession Collection Indexes
    console.log('Creating NodeSession collection indexes...');
    const nodeCollection = db.collection('nodesessions');
    
    await nodeCollection.createIndex({ user: 1 });
    await nodeCollection.createIndex({ walletAddress: 1 });
    await nodeCollection.createIndex({ sessionId: 1 });
    await nodeCollection.createIndex({ deviceIP: 1 });
    await nodeCollection.createIndex({ status: 1 });
    await nodeCollection.createIndex({ startTime: -1 });
    await nodeCollection.createIndex({ endTime: -1 });
    await nodeCollection.createIndex({ deviceType: 1 });
    await nodeCollection.createIndex({ browser: 1 });
    await nodeCollection.createIndex({ platform: 1 });
    await nodeCollection.createIndex({ lastHeartbeat: -1 });
    await nodeCollection.createIndex({ nodeQuality: 1 });
    await nodeCollection.createIndex({ performanceScore: -1 });
    
    // Compound indexes for NodeSession collection
    await nodeCollection.createIndex({ walletAddress: 1, startTime: -1 });
    await nodeCollection.createIndex({ user: 1, startTime: -1 });
    await nodeCollection.createIndex({ sessionId: 1, startTime: -1 });
    await nodeCollection.createIndex({ deviceIP: 1, startTime: -1 });
    await nodeCollection.createIndex({ status: 1, startTime: -1 });
    await nodeCollection.createIndex({ deviceType: 1, browser: 1, platform: 1 });
    await nodeCollection.createIndex({ 'geolocation.country': 1, 'geolocation.region': 1 });
    await nodeCollection.createIndex({ pointsEarned: -1, uptime: -1 });
    await nodeCollection.createIndex({ startTime: -1, endTime: -1 });
    await nodeCollection.createIndex({ errorCount: -1, warningCount: -1 });
    await nodeCollection.createIndex({ nodeQuality: 1, performanceScore: -1 });
    
    console.log('✅ NodeSession collection indexes created');
    
    // Check index usage and provide recommendations
    console.log('\n📊 Index Analysis:');
    
    const collections = ['users', 'lotterywinners', 'pointshistories', 'nodesessions'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      console.log(`\n${collectionName}: ${indexes.length} indexes created`);
      
      try {
        // Get collection stats
        const stats = await db.runCommand({ collStats: collectionName });
        console.log(`  - Documents: ${stats.count?.toLocaleString() || 'N/A'}`);
        console.log(`  - Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (error) {
        console.log(`  - Stats: Unable to retrieve (${error.message})`);
      }
    }
    
    console.log('\n🎉 All indexes created successfully!');
    console.log('\n📋 Performance Tips:');
    console.log('1. Monitor query performance using MongoDB Compass or db.collection.explain()');
    console.log('2. Use .lean() for read-only queries to improve performance');
    console.log('3. Implement proper pagination with compound indexes');
    console.log('4. Consider archiving old data to separate collections');
    console.log('5. Use aggregation pipelines with $match stages early in the pipeline');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createIndexes().catch(console.error);
}

module.exports = { createIndexes };