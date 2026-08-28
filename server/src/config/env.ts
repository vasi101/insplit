import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV?.trim() ?? 'development';
const port = Number(process.env.PORT ?? 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:8081')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (nodeEnv === 'production' && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS must contain at least one origin in production');
}

const accessSecret = requireEnv('JWT_ACCESS_SECRET');
const refreshSecret = requireEnv('JWT_REFRESH_SECRET');

if (nodeEnv === 'production' && (accessSecret.length < 32 || refreshSecret.length < 32)) {
  throw new Error('JWT secrets must each be at least 32 characters in production');
}

export const env = {
  port,
  nodeEnv,
  mongodbUri: requireEnv('MONGODB_URI'),
  jwt: {
    accessSecret,
    refreshSecret,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  corsOrigins,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
  },
};
