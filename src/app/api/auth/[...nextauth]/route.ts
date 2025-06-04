import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';

// Extend the built-in types
declare module 'next-auth' {
  interface User {
    walletAddress?: string;
    id?: string;
  }

  interface Session {
    user: {
      walletAddress?: string;
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    walletAddress?: string;
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
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add wallet address to token when signing in
      if (user) {
        token.walletAddress = user.walletAddress;
      }
      return token;
    },
    async session({ session, token }) {
      // Add wallet address to session
      if (session.user) {
        session.user.id = token.sub;
        session.user.walletAddress = token.walletAddress as string;
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };