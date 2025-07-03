# Scripts Directory

This directory contains utility scripts for the TOPAY Foundation Dashboard application.

## Available Scripts

### 🔧 setup-environment.js

**Purpose**: Validates and sets up the development environment.

**Usage**:

```bash
node scripts/setup-environment.js
```

**What it does**:

- Checks for environment configuration files (`.env.local` or `.env`)
- Creates a template `.env.local` file if none exists
- Validates required and optional environment variables
- Tests MongoDB URI format
- Checks for required and optional dependencies
- Provides setup summary and next steps

**When to use**:

- First time setting up the project
- Troubleshooting environment issues
- Before running other scripts

---

### 🗄️ optimize-database.js

**Purpose**: Optimizes MongoDB database performance by creating indexes and analyzing collections.

**Usage**:

```bash
node scripts/optimize-database.js
```

**What it does**:

- Connects to MongoDB using `NEXT_MONGO_URI` environment variable
- Creates optimized indexes for all collections:
  - `lotterywinners`: Indexes on wallet address, date, amount, transaction hash
  - `users`: Indexes on wallet address, email, referral code, creation date
  - `pointshistories`: Indexes on user ID, type, date, amount
  - `nodesessions`: Indexes on user ID, status, start/end time
- Displays collection statistics (document count, average size, total size)
- Provides performance recommendations
- Shows execution time for optimization process

**Prerequisites**:

- MongoDB server must be running
- `NEXT_MONGO_URI` environment variable must be set
- Database connection must be accessible

**When to use**:

- After setting up a new database
- When experiencing slow query performance
- Periodically for database maintenance
- After importing large amounts of data

---

## Environment Setup Guide

### 1. First Time Setup

```bash
# 1. Run environment setup
node scripts/setup-environment.js

# 2. Edit the created .env.local file with your actual values
# 3. Ensure MongoDB is running
# 4. Optimize the database
node scripts/optimize-database.js
```

### 2. Required Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_MONGO_URI` | MongoDB connection string | ✅ Yes | `mongodb://localhost:27017/topay-dashboard` |
| `NEXTAUTH_SECRET` | NextAuth.js secret key | ⚠️ Recommended | `your-secret-key-here` |
| `NEXTAUTH_URL` | Application URL | ⚠️ Recommended | `http://localhost:3000` |

### 3. Optional Environment Variables

| Variable | Description | Example |
|----------|-------------|----------|
| `TWITTER_CLIENT_ID` | Twitter API client ID | `your-twitter-client-id` |
| `TWITTER_CLIENT_SECRET` | Twitter API client secret | `your-twitter-client-secret` |
| `TWITTER_BEARER_TOKEN` | Twitter API bearer token | `your-twitter-bearer-token` |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | Reown project ID | `your-reown-project-id` |
| `SUPPORT_EMAIL` | Support contact email | `support@topayfoundation.com` |

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoServerSelectionError: ECONNREFUSED`

**Solutions**:

1. Ensure MongoDB is running:

   ```bash
   # Windows (if MongoDB is installed as service)
   net start MongoDB
   
   # Or start manually
   mongod
   ```

2. Check your `NEXT_MONGO_URI` in `.env.local`:

   ```env
   NEXT_MONGO_URI=mongodb://localhost:27017/topay-dashboard
   ```

3. Verify MongoDB is accessible:

   ```bash
   # Test connection using MongoDB shell
   mongosh mongodb://localhost:27017/topay-dashboard
   ```

### Environment File Issues

**Error**: Environment variables not loading

**Solutions**:

1. Ensure `.env.local` exists in the project root
2. Check file format (no spaces around `=`)
3. Restart your development server after changes
4. Run `node scripts/setup-environment.js` to validate

### Dependency Issues

**Error**: Missing dependencies

**Solutions**:

1. Install missing dependencies:

   ```bash
   npm install
   ```

2. For testing dependencies:

   ```bash
   npm install --save-dev node-mocks-http mongodb-memory-server @types/node-mocks-http
   ```

## Script Development Guidelines

### Adding New Scripts

1. **File Naming**: Use kebab-case (e.g., `setup-environment.js`)
2. **Documentation**: Add comprehensive JSDoc comments
3. **Error Handling**: Include proper error handling and user-friendly messages
4. **Logging**: Use colored console output for better UX
5. **Environment**: Always validate required environment variables
6. **Exit Codes**: Use appropriate exit codes (0 for success, 1 for error)

### Script Template

```javascript
/**
 * Script Name
 * 
 * Description of what this script does.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function main() {
  try {
    log('🚀 Script Name', 'cyan');
    
    // Script logic here
    
    log('✅ Script completed successfully', 'green');
  } catch (error) {
    log(`❌ Script failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
```

## Performance Tips

### Database Optimization

1. **Run optimization regularly**: Execute `optimize-database.js` after:
   - Large data imports
   - Schema changes
   - Performance issues

2. **Monitor index usage**: Check MongoDB logs for slow queries

3. **Database maintenance**: Consider periodic cleanup of old data

### Development Workflow

1. **Environment validation**: Run `setup-environment.js` when:
   - Setting up new development environment
   - Troubleshooting configuration issues
   - Onboarding new team members

2. **Regular checks**: Include environment validation in CI/CD pipeline

## Support

For issues with these scripts:

1. Check the troubleshooting section above
2. Verify your environment configuration
3. Review the MongoDB connection settings
4. Check the project's main README.md for additional setup instructions

For additional help, contact the development team or create an issue in the project repository.
