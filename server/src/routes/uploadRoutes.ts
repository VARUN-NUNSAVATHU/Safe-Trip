import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * File Upload Route (Profile Avatars & Trip Media Attachments)
 * Kalvium Backend Concept: File upload handling, MIME-type validation, size limits
 */
router.post('/avatar', authenticateToken, (req: Request, res: Response): void => {
  const { fileName, fileType, fileBase64, sizeBytes } = req.body || {};

  if (!fileBase64 || !fileType) {
    res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Bad Request',
      message: 'Missing fileBase64 data or fileType in upload payload.',
    });
    return;
  }

  // Validate allowed image MIME types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(fileType)) {
    res.status(415).json({
      success: false,
      statusCode: 415,
      error: 'Unsupported Media Type',
      message: `Invalid file format: ${fileType}. Allowed formats: ${allowedTypes.join(', ')}`,
    });
    return;
  }

  // Enforce 5MB size limit (5 * 1024 * 1024 bytes)
  if (sizeBytes && sizeBytes > 5242880) {
    res.status(413).json({
      success: false,
      statusCode: 413,
      error: 'Payload Too Large',
      message: 'Avatar file size exceeds 5MB limit.',
    });
    return;
  }

  const generatedUrl = `https://storage.safetrip.app/avatars/${Date.now()}_${fileName || 'avatar.jpg'}`;

  res.status(201).json({
    success: true,
    statusCode: 201,
    fileUrl: generatedUrl,
    message: 'Avatar uploaded and stored successfully.',
  });
});

export default router;
