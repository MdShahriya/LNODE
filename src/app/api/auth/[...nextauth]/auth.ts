import CredentialsProvider from 'next-auth/providers/credentials';
import TwitterProvider from 'next-auth/providers/twitter';
import { NextAuthOptions } from 'next-auth';

// Define Twitter-specific types
interface TwitterProfile {
  username?: string;
  data?: {
    username?: string;
  };
}

interface TwitterAccount {
  provider: string;
  type: string;
  providerAccountId: string;
  username?: string;
  access_token?: string;
  token_type?: string;
  scope?: string;
}

// Extend the built-in types
declare module 'next-auth' {
  interface User {
    walletAddress?: string;
    id?: string;
    twitterId?: string;
    twitterUsername?: string;
  }

  interface Session {
    user: {
      walletAddress?: string;
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      twitterId?: string;
      twitterUsername?: string;
    }
  }


}

declare module 'next-auth/jwt' {
  interface JWT {
    walletAddress?: string;
    twitterId?: string;
    twitterUsername?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        walletAddress: { label: 'Wallet Address', type: 'text' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.walletAddress) {
            return null;
          }

          // Return a user object with the wallet address
          return {
            id: credentials.walletAddress,
            walletAddress: credentials.walletAddress,
          };
        } catch (error) {
          console.error('Error in NextAuth authorize:', error);
          return null;
        }
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Twitter OAuth sign in
      if (account?.provider === 'twitter') {
        // Store Twitter information in user object
        user.twitterId = account.providerAccountId;
        user.twitterUsername = (profile as TwitterProfile)?.username || (profile as TwitterProfile)?.data?.username;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Add wallet address to token when signing in
      if (user) {
        token.walletAddress = user.walletAddress;
        token.twitterId = user.twitterId;
        token.twitterUsername = user.twitterUsername;
      }
      
      // Store Twitter account info from OAuth
      if (account?.provider === 'twitter') {
        token.twitterId = account.providerAccountId;
        token.twitterUsername = (account as TwitterAccount).username;
      }
      
      return token;
    },
    async session({ session, token }) {
      // Add wallet address and Twitter info to session
      if (session.user) {
        session.user.id = token.sub;
        session.user.walletAddress = token.walletAddress as string;
        session.user.twitterId = token.twitterId as string;
        session.user.twitterUsername = token.twitterUsername as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-fallback-secret-key',
};