declare global {
  // This is necessary to make TypeScript recognize the global mongoose variable
  // that we're using for caching the database connection
  interface MongooseCache {
    conn: typeof import('mongoose') | null;
    promise: Promise<unknown> | null;
  }
  
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;

  // Add mongoose to the NodeJS global type
  namespace NodeJS {
    interface Global {
      mongoose: MongooseCache;
    }

    // Environment variables
    interface ProcessEnv {
      NEXT_MONGO_URI?: string;
      NEXT_PUBLIC_REOWN_PROJECT_ID?: string;
      NEXT_PUBLIC_BASE_URL?: string;
    }
  }

  // TOPAY Node Extension types
  interface Window {
    topayNodeExtensionDetected?: boolean;
    topayNodeExtension?: {
      getNodeStatus: () => Promise<unknown>;
      toggleNode: () => Promise<unknown>;
      getConnectionHistory: () => Promise<unknown[]>;
      connectWallet: (walletAddress: string) => Promise<boolean>;
    };
  }
}

// This export is needed to make this file a module
export {}