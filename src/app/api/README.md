# TOPAY Dashboard Backend API

This directory contains the API routes for the TOPAY Foundation Dashboard application. These routes handle user management, task tracking, referrals, and airdrops.

## API Routes

### User Management

#### `/api/create-user`

- **Method**: POST
- **Purpose**: Creates a new user in the database when a wallet is first connected
- **Request Body**:

  ```json
  {
    "name": "User's name",
    "email": "user@example.com",
    "walletAddress": "0x123...",
    "bio": "User's bio"
  }
  ```

- **Response**: Returns the created user object

#### `/api/update-profile`

- **Method**: PUT/POST
- **Purpose**: Updates an existing user's profile information
- **Request Body**: Same as create-user
- **Response**: Returns the updated user object

#### `/api/get-profile`

- **Method**: GET
- **Query Parameters**: `walletAddress`
- **Purpose**: Retrieves a user's profile by their wallet address
- **Response**: Returns the user object if found

### Tasks

#### `/api/tasks`

- **Method**: GET
- **Query Parameters**:
  - `walletAddress`: Optional - Filter tasks by user
  - `status`: Optional - Filter by task status (pending, completed, verified)
- **Purpose**: Lists all tasks or tasks for a specific user with completion status
- **Response**: Array of task objects with user completion status

#### `/api/tasks`

- **Method**: POST
- **Purpose**: Creates a new task (admin only in production)
- **Request Body**:

  ```json
  {
    "title": "Task Title",
    "description": "Task Description",
    "points": 100,
    "requirements": "Task requirements",
    "completionSteps": "Steps to complete",
    "category": "social",
    "isActive": true
  }
  ```

- **Response**: Created task object

#### `/api/tasks/submit`

- **Method**: POST
- **Purpose**: Submit a completed task for verification
- **Request Body**:

  ```json
  {
    "walletAddress": "0x...",
    "taskId": "task-id",
    "proofOfWork": "Proof of completion"
  }
  ```

- **Response**: User task object

#### `/api/tasks/submit`

- **Method**: PUT
- **Purpose**: Verify a task submission (admin only in production)
- **Request Body**:

  ```json
  {
    "userTaskId": "user-task-id",
    "verified": true,
    "earnedPoints": 100
  }
  ```

- **Response**: Updated user task object

### Referrals

#### `/api/referrals`

- **Method**: GET
- **Query Parameters**:
  - `walletAddress`: Get referrals for this user
  - `referralCode`: Look up a specific referral code
- **Purpose**: Get referrals for a user or lookup a referral code
- **Response**: Referral information and statistics

#### `/api/referrals`

- **Method**: POST
- **Purpose**: Create a new referral
- **Request Body**:

  ```json
  {
    "refereeWalletAddress": "0x...",
    "referralCode": "ABC123"
  }
  ```

- **Response**: Created referral object

#### `/api/referrals`

- **Method**: PUT
- **Purpose**: Update a referral status
- **Request Body**:

  ```json
  {
    "referralId": "referral-id",
    "status": "completed",
    "pointsAwarded": 100
  }
  ```

- **Response**: Updated referral object

### Airdrops

#### `/api/airdrops`

- **Method**: GET
- **Query Parameters**:
  - `walletAddress`: Optional - Filter airdrops by user eligibility
- **Purpose**: Lists all airdrops or airdrops for a specific user with eligibility status
- **Response**: Array of airdrop objects with user eligibility status

#### `/api/airdrops`

- **Method**: POST
- **Purpose**: Creates a new airdrop (admin only in production)
- **Request Body**:

  ```json
  {
    "name": "Airdrop Name",
    "description": "Airdrop Description",
    "totalAmount": 1000000,
    "tokenSymbol": "TOPAY",
    "startDate": "2023-01-01T00:00:00Z",
    "endDate": "2023-12-31T23:59:59Z",
    "requirements": "Airdrop requirements",
    "isActive": true
  }
  ```

- **Response**: Created airdrop object

#### `/api/airdrops/eligibility`

- **Method**: POST
- **Purpose**: Check or update a user's eligibility for an airdrop
- **Request Body**:

  ```json
  {
    "walletAddress": "0x...",
    "airdropId": "airdrop-id"
  }
  ```

- **Response**: Eligibility status and score

#### `/api/airdrops/eligibility`

- **Method**: PUT
- **Purpose**: Claim an airdrop
- **Request Body**:

  ```json
  {
    "walletAddress": "0x...",
    "airdropId": "airdrop-id",
    "transactionHash": "0x..."
  }
  ```

- **Response**: Claim information

## Database Connection

The API routes use MongoDB for data storage, with connection handling provided by the `connectDB()` function in `src/lib/db.ts`. The database connection string can be configured using the `MONGODB_URI` environment variable.

## Data Models

### User

- `name`: User's display name
- `email`: User's email address
- `walletAddress`: User's blockchain wallet address (unique identifier)
- `bio`: User's biography or description
- `createdAt`: Timestamp of when the user was created
- `updatedAt`: Timestamp of when the user was last updated

### Task

- `title`: String (required)
- `description`: String (required)
- `points`: Number (required)
- `requirements`: String
- `completionSteps`: String
- `category`: String (enum: social, community, technical, other)
- `isActive`: Boolean
- `createdAt`: Date
- `updatedAt`: Date

### UserTask

- `user`: ObjectId (reference to User)
- `task`: ObjectId (reference to Task)
- `status`: String (enum: pending, completed, verified)
- `completionDate`: Date
- `verificationDate`: Date
- `proofOfWork`: String
- `earnedPoints`: Number
- `createdAt`: Date
- `updatedAt`: Date

### Referral

- `referrer`: ObjectId (reference to User)
- `referee`: ObjectId (reference to User)
- `referralCode`: String
- `status`: String (enum: pending, completed)
- `pointsAwarded`: Number
- `completedAt`: Date
- `createdAt`: Date
- `updatedAt`: Date

### Airdrop

- `name`: String (required)
- `description`: String (required)
- `totalAmount`: Number (required)
- `tokenSymbol`: String
- `startDate`: Date (required)
- `endDate`: Date (required)
- `requirements`: String
- `isActive`: Boolean
- `createdAt`: Date
- `updatedAt`: Date

### UserAirdrop

- `user`: ObjectId (reference to User)
- `airdrop`: ObjectId (reference to Airdrop)
- `status`: String (enum: eligible, claimed, ineligible)
- `eligibilityScore`: Number
- `claimedAmount`: Number
- `claimedAt`: Date
- `transactionHash`: String
- `createdAt`: Date
- `updatedAt`: Date

## Frontend Integration

The frontend components interact with these API routes to:

1. Create a new user when a wallet is first connected
2. Fetch the user's profile data when the wallet is connected
3. Update the user's profile when they submit the edit form
4. List and submit tasks
5. Generate and track referrals
6. Check eligibility and claim airdrops

The application uses a hybrid approach, storing data both in the database and in localStorage for offline access.
