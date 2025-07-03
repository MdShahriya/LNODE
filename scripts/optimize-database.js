/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Database Optimization Script for TOPAY Foundation Dashboard
 * 
 * This script creates optimized indexes for better query performance
 * and reduces the "Scanned Objects / Returned" ratio in MongoDB.
 * 
 * Run this script using: node scripts/optimize-database.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection configuration - use the same env var as the app
const MONGODB_URI = process.env.NEXT_MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/topay-dashboard';

if (!MONGODB_URI || MONGODB_URI === 'mongodb://localhost:27017/topay-dashboard') {
  console.warn('⚠️  Warning: Using default MongoDB URI. Please set NEXT_MONGO_URI environment variable.');
  console.warn('   You can create a .env.local file with: NEXT_MONGO_URI=your_mongodb_connection_string');
}

async function optimizeDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Optimize LotteryWinner collection
    console.log('\n=== Optimizing LotteryWinner Collection ===');
    const lotteryCollection = db.collection('lotterywinners');
    
    // Create indexes for LotteryWinner
    const lotteryIndexes = [
      // Single field indexes
      { date: 1 },
      { date: -1 },
      { walletAddress: 1 },
      
      // Compound indexes for efficient queries
      { date: -1, _id: 1 }, // For pagination with sorting
      { walletAddress: 1, date: -1 }, // For user-specific queries
      { date: 1, walletAddress: 1 }, // For date range + wallet queries
    ];
    
    for (const index of lotteryIndexes) {
      try {
        await lotteryCollection.createIndex(index);
        console.log(`✓ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`- Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`✗ Failed to create index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }
    
    // Optimize User collection
    console.log('\n=== Optimizing User Collection ===');
    const userCollection = db.collection('users');
    
    const userIndexes = [
      { walletAddress: 1 }, // Primary lookup field
      { points: -1 }, // For leaderboards
      { nodeStatus: 1 }, // For filtering active nodes
      { isVerified: 1 }, // For filtering verified users
      { walletAddress: 1, points: -1 }, // Compound for user stats
      { nodeStatus: 1, points: -1 }, // For active node rankings
    ];
    
    for (const index of userIndexes) {
      try {
        await userCollection.createIndex(index);
        console.log(`✓ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`- Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`✗ Failed to create index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }
    
    // Optimize PointsHistory collection
    console.log('\n=== Optimizing PointsHistory Collection ===');
    const pointsCollection = db.collection('pointshistories');
    
    const pointsIndexes = [
      { user: 1 },
      { walletAddress: 1 },
      { timestamp: -1 },
      { source: 1 },
      { walletAddress: 1, timestamp: -1 }, // For user activity timeline
      { user: 1, timestamp: -1 }, // For user points history
      { source: 1, timestamp: -1 }, // For source-based analytics
    ];
    
    for (const index of pointsIndexes) {
      try {
        await pointsCollection.createIndex(index);
        console.log(`✓ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`- Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`✗ Failed to create index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }
    
    // Optimize NodeSession collection
    console.log('\n=== Optimizing NodeSession Collection ===');
    const sessionCollection = db.collection('nodesessions');
    
    const sessionIndexes = [
      { user: 1 },
      { walletAddress: 1 },
      { startTime: -1 },
      { endTime: -1 },
      { isActive: 1 },
      { walletAddress: 1, startTime: -1 }, // For user session history
      { isActive: 1, startTime: -1 }, // For active sessions
      { user: 1, isActive: 1 }, // For user active sessions
    ];
    
    for (const index of sessionIndexes) {
      try {
        await sessionCollection.createIndex(index);
        console.log(`✓ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`- Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`✗ Failed to create index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }
    
    // Display collection statistics
    console.log('\n=== Collection Statistics ===');
    const collections = ['lotterywinners', 'users', 'pointshistories', 'nodesessions'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const stats = await collection.stats();
        const indexes = await collection.listIndexes().toArray();
        
        console.log(`\n${collectionName.toUpperCase()}:`);
        console.log(`  Documents: ${stats.count.toLocaleString()}`);
        console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Indexes: ${indexes.length}`);
        console.log(`  Index Names: ${indexes.map(idx => idx.name).join(', ')}`);
      } catch (error) {
        console.log(`  Collection '${collectionName}' not found or error:`, error.message);
      }
    }
    
    console.log('\n=== Performance Recommendations ===');
    console.log('1. Monitor query performance using MongoDB Compass or db.collection.explain()');
    console.log('2. Consider using aggregation pipelines for complex queries');
    console.log('3. Use projection to limit returned fields when possible');
    console.log('4. Implement proper pagination with skip/limit or cursor-based pagination');
    console.log('5. Use estimatedDocumentCount() instead of countDocuments() for large collections');
    console.log('6. Consider implementing data archiving for old lottery winners');
    console.log('7. Monitor index usage with db.collection.getIndexes() and remove unused indexes');
    
    console.log('\n✅ Database optimization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the optimization
if (require.main === module) {
  optimizeDatabase().catch(console.error);
}

module.exports = { optimizeDatabase };