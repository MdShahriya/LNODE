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
  }
}

// This export is needed to make this file a module
export {}