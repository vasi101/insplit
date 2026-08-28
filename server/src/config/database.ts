import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10_000 });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});
