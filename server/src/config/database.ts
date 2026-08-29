import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from './env';

let connectionPromise: Promise<typeof mongoose> | null = null;

const connectionOptions = {
  serverSelectionTimeoutMS: 10_000,
  maxPoolSize: 10,
};

function isSrvDnsRefused(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const dnsError = error as { code?: string; syscall?: string };
  return dnsError.code === 'ECONNREFUSED' && dnsError.syscall === 'querySrv';
}

async function connectWithDnsFallback(): Promise<typeof mongoose> {
  try {
    return await mongoose.connect(env.mongodbUri, connectionOptions);
  } catch (error) {
    if (!isSrvDnsRefused(error)) throw error;

    // Some Windows/router DNS combinations reject Node's SRV queries even
    // though ordinary system lookups work. Retry only that failure via public DNS.
    console.warn('MongoDB SRV lookup was refused; retrying with public DNS resolvers.');
    dns.setServers(['1.1.1.1', '8.8.8.8']);
    return mongoose.connect(env.mongodbUri, connectionOptions);
  }
}

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  // Reuse one connection attempt per warm serverless instance. Creating a new
  // connection for every request can exhaust the Atlas connection pool.
  if (!connectionPromise) {
    connectionPromise = connectWithDnsFallback();
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
