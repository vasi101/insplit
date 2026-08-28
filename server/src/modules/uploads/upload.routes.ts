import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { upload } from '../../utils/upload';
import { uploadImages } from './upload.controller';

const router = Router();

// All upload routes require authentication
router.use(authMiddleware);

/**
 * POST /api/upload
 * Field: "images" (up to 5 files)
 */
router.post('/', upload.array('images', 5), uploadImages);

export default router;
