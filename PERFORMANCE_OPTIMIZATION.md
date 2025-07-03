# Database Performance Optimization Guide

## Overview

This document outlines the performance optimizations implemented to resolve the "Query Targeting: Scanned Objects / Returned has gone above 1000" issue in the TOPAY Foundation Dashboard.

## Problem Analysis

The high scan ratio was caused by:

1. **Missing database indexes** on frequently queried fields
2. **Inefficient queries** that scan entire collections
3. **Frontend filtering** instead of database-level filtering
4. **Unoptimized pagination** without proper compound indexes

## Implemented Solutions

### 1. Database Schema Optimizations

#### LotteryWinner Model (`src/models/LotteryWinner.ts`)

**Added Indexes:**

```javascript
// Single field indexes
date: { index: true }  // For date range queries
walletAddress: { index: true }  // For user-specific queries

// Compound indexes
{ date: -1, _id: 1 }  // For efficient pagination with sorting
{ walletAddress: 1, date: -1 }  // For user lottery history
```

**Benefits:**

- Date range queries now use index instead of collection scan
- Sorting with pagination is optimized
- User-specific lottery queries are faster

### 2. API Query Optimizations

#### Admin Lottery Winners API (`src/app/api/admin/lottery/winners/route.ts`)

**Before:**

```javascript
const winners = await LotteryWinner.find({})
  .sort({ date: -1 })
  .skip(skip)
  .limit(limit)
  .lean()

const totalWinners = await LotteryWinner.countDocuments({})
```

**After:**

```javascript
// Use aggregation pipeline for better performance
const pipeline = [
  { $sort: { date: -1, _id: 1 } }, // Use compound index
  { $skip: skip },
  { $limit: limit },
  { $project: { _id: 1, date: 1, walletAddress: 1, username: 1, prize: 1 } }
]

const winners = await LotteryWinner.aggregate(pipeline)
const totalWinners = await LotteryWinner.estimatedDocumentCount() // Faster for large collections
```

**Improvements:**

- Uses compound index for efficient sorting
- Aggregation pipeline is more efficient than find() + sort() + skip() + limit()
- `estimatedDocumentCount()` is faster than `countDocuments()` for large collections
- Projection reduces data transfer

#### Public Lottery Winners API (`src/app/api/lottery/winners/route.ts`)

**Before:**

```javascript
const winners = await LotteryWinner.find({
  date: { $gte: startOfDay, $lt: endOfDay }
})
.sort({ date: -1 })
.skip(skip)
.limit(limit)
.lean()
```

**After:**

```javascript
// Use UTC for consistency and aggregation for performance
const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1))

const pipeline = [
  { $match: { date: { $gte: startOfDay, $lt: endOfDay } } },
  { $sort: { date: -1, _id: 1 } },
  { $skip: skip },
  { $limit: limit },
  { $project: { _id: 1, date: 1, walletAddress: 1, username: 1, prize: 1 } }
]
```

**Improvements:**

- UTC date handling for consistency across timezones
- Aggregation pipeline with indexed fields
- Efficient date range queries using index

### 3. Frontend Optimizations

#### Dashboard Lottery Winner Fetching (`src/app/dashboard/page.tsx`)

**Before:**

```javascript
// Fetch 100 records and filter on frontend
const response = await fetch('/api/lottery/winners?page=1&limit=100')
const todaysWinner = data.winners.find(winner => isToday(winner.date))
```

**After:**

```javascript
// Fetch only 1 record (API already filters by today's date)
const response = await fetch('/api/lottery/winners?page=1&limit=1')
setTodaysWinner(data.winners.length > 0 ? data.winners[0] : null)
```

**Improvements:**

- Reduced data transfer from 100 records to 1
- Eliminated frontend filtering
- Faster page load times

## Database Optimization Script

Run the optimization script to ensure all indexes are properly created:

```bash
node scripts/optimize-database.js
```

This script will:

- Create all necessary indexes
- Display collection statistics
- Provide performance recommendations
- Show index usage information

## Performance Monitoring

### Key Metrics to Monitor

1. **Query Execution Time**

   ```javascript
   // Add to your queries for monitoring
   const startTime = Date.now()
   const result = await collection.find(query)
   console.log(`Query took: ${Date.now() - startTime}ms`)
   ```

2. **Index Usage**

   ```javascript
   // Check if queries are using indexes
   const explanation = await collection.find(query).explain('executionStats')
   console.log('Execution stats:', explanation.executionStats)
   ```

3. **Scanned vs Returned Ratio**
   - Target: < 10 scanned per returned document
   - Monitor in MongoDB Compass or Atlas

### MongoDB Compass Queries for Monitoring

```javascript
// Check index usage
db.lotterywinners.find({ date: { $gte: ISODate('2024-01-01') } }).explain('executionStats')

// Check collection stats
db.lotterywinners.stats()

// List all indexes
db.lotterywinners.getIndexes()
```

## Expected Performance Improvements

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Admin lottery list (1000 records) | ~500ms | ~50ms | 90% faster |
| Today's winner lookup | ~200ms | ~10ms | 95% faster |
| Date range queries | Full scan | Index scan | 99% faster |
| Pagination queries | ~300ms | ~30ms | 90% faster |
| Scanned/Returned ratio | >1000:1 | <10:1 | 99% reduction |

## Additional Recommendations

### 1. Data Archiving

Consider archiving old lottery winners to a separate collection:

```javascript
// Archive winners older than 1 year
const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
db.lotterywinners.aggregate([
  { $match: { date: { $lt: oneYearAgo } } },
  { $out: 'lotterywinners_archive' }
])
```

### 2. Caching Strategy

Implement Redis caching for frequently accessed data:

```javascript
// Cache today's winner for 1 hour
const cacheKey = `today_winner_${new Date().toDateString()}`
const cachedWinner = await redis.get(cacheKey)
if (!cachedWinner) {
  const winner = await fetchTodaysWinner()
  await redis.setex(cacheKey, 3600, JSON.stringify(winner))
}
```

### 3. Connection Pooling

Optimize MongoDB connection settings:

```javascript
const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  bufferCommands: false,
}
```

### 4. Query Optimization Checklist

- [ ] Use indexes for all query fields
- [ ] Implement proper pagination
- [ ] Use aggregation pipelines for complex queries
- [ ] Project only necessary fields
- [ ] Use `estimatedDocumentCount()` for large collections
- [ ] Implement proper error handling
- [ ] Monitor query performance regularly
- [ ] Use compound indexes for multi-field queries
- [ ] Consider data archiving for old records
- [ ] Implement caching for frequently accessed data

## Troubleshooting

### Common Issues

1. **Indexes not being used**
   - Check query structure matches index
   - Verify index exists with `db.collection.getIndexes()`
   - Use `explain()` to debug query execution

2. **Slow aggregation queries**
   - Ensure `$match` stages come before `$sort`
   - Use indexes in early pipeline stages
   - Limit data early with `$project`

3. **High memory usage**
   - Use `allowDiskUse: true` for large aggregations
   - Implement proper pagination
   - Consider data archiving

### Performance Testing

```bash
# Test query performance
node -e "require('./scripts/optimize-database.js').optimizeDatabase()"

# Monitor in real-time
mongotop --host localhost:27017

# Check slow queries
db.setProfilingLevel(2, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

## Conclusion

These optimizations should significantly reduce the "Scanned Objects / Returned" ratio and improve overall application performance. Regular monitoring and maintenance of these optimizations will ensure continued good performance as the application scales.
