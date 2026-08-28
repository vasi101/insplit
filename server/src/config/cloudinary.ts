import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

if (env.cloudinary.configured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
} else {
  console.warn('⚠️  Cloudinary is not configured. Image upload will be unavailable.');
}

export { cloudinary };

