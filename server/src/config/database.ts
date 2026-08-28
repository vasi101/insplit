import mongoose from 'mongoose';
import { env } from './env';

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  // Reuse one connection attempt per warm serverless instance. Creating a new
  // connection for every request can exhaust the Atlas connection pool.
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    });
  }

  try {
    await connectionPromise;
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    connectionPromise = null;
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  connectionPromise = null;
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});
