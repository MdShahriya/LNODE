/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Environment Setup Script
 * 
 * This script helps set up the development environment and
 * validates that all required configurations are in place.
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

function checkEnvironmentFile() {
  const envFiles = ['.env.local', '.env'];
  const projectRoot = path.join(__dirname, '..');
  
  log('\n🔍 Checking environment configuration...', 'blue');
  
  for (const envFile of envFiles) {
    const envPath = path.join(projectRoot, envFile);
    if (fs.existsSync(envPath)) {
      log(`✅ Found ${envFile}`, 'green');
      return envPath;
    }
  }
  
  log('❌ No environment file found (.env.local or .env)', 'red');
  return null;
}

function createEnvironmentTemplate() {
  const projectRoot = path.join(__dirname, '..');
  const envPath = path.join(projectRoot, '.env.local');
  
  const template = `# TOPAY Foundation Dashboard Environment Configuration
# Copy this file and update with your actual values

# MongoDB Configuration
# Replace with your actual MongoDB connection string
NEXT_MONGO_URI=mongodb://localhost:27017/topay-dashboard

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Twitter API Configuration (Optional)
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
TWITTER_CALLBACK_URL=http://localhost:3000/api/auth/twitter/callback

# API Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_REOWN_PROJECT_ID=your-reown-project-id

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CACHING=false
ENABLE_RATE_LIMITING=false

# Support Email (Optional)
SUPPORT_EMAIL=support@topayfoundation.com
`;
  
  try {
    fs.writeFileSync(envPath, template);
    log(`✅ Created environment template: ${envPath}`, 'green');
    log('📝 Please update the values in .env.local with your actual configuration', 'yellow');
    return envPath;
  } catch (error) {
    log(`❌ Failed to create environment template: ${error.message}`, 'red');
    return null;
  }
}

function validateEnvironmentVariables(envPath) {
  log('\n🔍 Validating environment variables...', 'blue');
  
  // Load environment variables
  require('dotenv').config({ path: envPath });
  
  const requiredVars = [
    'NEXT_MONGO_URI'
  ];
  
  const optionalVars = [
    'NEXTAUTH_SECRET',
    'TWITTER_CLIENT_ID',
    'TWITTER_CLIENT_SECRET',
    'NEXT_PUBLIC_REOWN_PROJECT_ID'
  ];
  
  let allValid = true;
  
  // Check required variables
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log(`✅ ${varName}: Set`, 'green');
    } else {
      log(`❌ ${varName}: Missing (Required)`, 'red');
      allValid = false;
    }
  }
  
  // Check optional variables
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      log(`✅ ${varName}: Set`, 'green');
    } else {
      log(`⚠️  ${varName}: Not set (Optional)`, 'yellow');
    }
  }
  
  return allValid;
}

function testMongoDBConnection() {
  log('\n🔍 Testing MongoDB connection...', 'blue');
  
  const mongoUri = process.env.NEXT_MONGO_URI;
  
  if (!mongoUri) {
    log('❌ NEXT_MONGO_URI not set, skipping connection test', 'red');
    return false;
  }
  
  // Basic URI validation
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    log('❌ Invalid MongoDB URI format', 'red');
    log('   Expected: mongodb://... or mongodb+srv://...', 'yellow');
    return false;
  }
  
  log('✅ MongoDB URI format is valid', 'green');
  log('💡 To test the actual connection, run: node scripts/optimize-database.js', 'cyan');
  
  return true;
}

function checkDependencies() {
  log('\n🔍 Checking dependencies...', 'blue');
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = [
      'mongoose',
      'zod',
      'next'
    ];
    
    const optionalTestDeps = [
      'node-mocks-http',
      'mongodb-memory-server',
      '@types/node-mocks-http'
    ];
    
    let allRequired = true;
    
    for (const dep of requiredDeps) {
      if (dependencies[dep]) {
        log(`✅ ${dep}: ${dependencies[dep]}`, 'green');
      } else {
        log(`❌ ${dep}: Missing`, 'red');
        allRequired = false;
      }
    }
    
    let hasTestDeps = true;
    for (const dep of optionalTestDeps) {
      if (dependencies[dep]) {
        log(`✅ ${dep}: ${dependencies[dep]}`, 'green');
      } else {
        log(`⚠️  ${dep}: Missing (for testing)`, 'yellow');
        hasTestDeps = false;
      }
    }
    
    if (!hasTestDeps) {
      log('\n💡 To install testing dependencies, run:', 'cyan');
      log('   npm install --save-dev node-mocks-http mongodb-memory-server @types/node-mocks-http', 'cyan');
    }
    
    return allRequired;
  } catch (error) {
    log(`❌ Failed to read package.json: ${error.message}`, 'red');
    return false;
  }
}

function printSummary(envValid, depsValid, mongoValid) {
  log('\n📋 Setup Summary', 'blue');
  log('================', 'blue');
  
  log(`Environment: ${envValid ? '✅ Valid' : '❌ Issues found'}`, envValid ? 'green' : 'red');
  log(`Dependencies: ${depsValid ? '✅ Valid' : '❌ Issues found'}`, depsValid ? 'green' : 'red');
  log(`MongoDB Config: ${mongoValid ? '✅ Valid' : '❌ Issues found'}`, mongoValid ? 'green' : 'red');
  
  if (envValid && depsValid && mongoValid) {
    log('\n🎉 Environment setup is complete!', 'green');
    log('\n🚀 Next steps:', 'cyan');
    log('   1. Run: npm run dev (to start development server)', 'cyan');
    log('   2. Run: node scripts/optimize-database.js (to optimize database)', 'cyan');
    log('   3. Run: npm test (to run tests)', 'cyan');
  } else {
    log('\n⚠️  Please fix the issues above before proceeding', 'yellow');
  }
}

function main() {
  log('🚀 TOPAY Foundation Dashboard - Environment Setup', 'cyan');
  log('================================================', 'cyan');
  
  // Check for environment file
  let envPath = checkEnvironmentFile();
  
  // Create template if no environment file exists
  if (!envPath) {
    log('\n📝 Creating environment template...', 'blue');
    envPath = createEnvironmentTemplate();
    if (!envPath) {
      log('\n❌ Setup failed. Please create .env.local manually.', 'red');
      process.exit(1);
    }
  }
  
  // Validate environment variables
  const envValid = validateEnvironmentVariables(envPath);
  
  // Check dependencies
  const depsValid = checkDependencies();
  
  // Test MongoDB configuration
  const mongoValid = testMongoDBConnection();
  
  // Print summary
  printSummary(envValid, depsValid, mongoValid);
}

// Run the setup if this script is executed directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

module.exports = { main };