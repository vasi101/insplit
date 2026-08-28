import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../utils/response';
import { uploadToCloudinary } from '../../utils/upload';

/**
 * POST /api/upload
 * Accepts up to 5 images (multipart/form-data, field: "images")
 * Returns array of Cloudinary secure URLs
 */
export async function uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'At least one image file is required'));
      return;
    }

    // Upload all files to Cloudinary in parallel
    const urls = await Promise.all(files.map((file) => uploadToCloudinary(file)));

    res.status(200).json(
      successResponse({ urls }, `${urls.length} image(s) uploaded successfully`)
    );
  } catch (error) {
    next(error);
  }
}

