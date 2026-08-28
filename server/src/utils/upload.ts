import multer from 'multer';
import { cloudinary } from '../config/cloudinary';
import streamifier from 'streamifier';
import { env } from '../config/env';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];

// Use memory storage — we'll stream buffers directly to Cloudinary v2
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, png, webp, heic)'));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter,
});

/**
 * Upload a single file buffer to Cloudinary and return the secure URL.
 */
export function uploadToCloudinary(file: Express.Multer.File): Promise<string> {
  if (!env.cloudinary.configured) {
    return Promise.reject(Object.assign(new Error('Image upload is not configured on this server'), { statusCode: 503, code: 'CLOUDINARY_NOT_CONFIGURED' }));
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'insplit/transactions',
        transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
}

