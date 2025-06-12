# TOPAY Foundation Dashboard App

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## User Registration with Wallet Address

This application includes functionality to automatically register users when they connect their wallet. The system:

1. Captures the connected wallet address from wagmi
2. Checks if the user already exists in the MongoDB database
3. Creates a new user record if they don't exist
4. Loads user data including points, uptime, and completed tasks

## MongoDB Integration

The application uses Mongoose to interact with MongoDB:

- User model schema in `src/models/User.ts`
- Database connection utility in `src/lib/db.ts`
- API endpoints for user operations in `src/app/api/user/`

## Getting Started

1. Copy the `.env.local.example` file to `.env.local`
2. Update the MongoDB connection string in `.env.local`
3. Install dependencies:

```bash
npm install
```

### Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [https://node.topayfoundation.com](https://node.topayfoundation.com) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API Endpoints

- `POST /api/user` - Register a new user with wallet address
- `GET /api/user?walletAddress=0x...` - Get user data by wallet address
- `POST /api/user/update-node-status` - Update node running status

## User Data Structure

```typescript
interface User {
  walletAddress: string;
  points: number;
  tasksCompleted: number;
  uptime: number;
  createdAt: Date;
  updatedAt: Date;
}
```
