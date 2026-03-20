import express, { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import verifyToken from '../middlewares/verifyToken';
import validator from '../middlewares/validator';
import { requestUpload } from '../validators/upload';
import FileUpload from '../models/fileUpload';
import User from '../models/user';
import { config } from '../config';
import { generateUploadUrl, generateDownloadUrl } from '../utils/s3';

const router: Router = express.Router();

const MAX_QUOTA_BYTES = 500 * 1024 * 1024; // 500MB per user

// POST /upload/request - Get a presigned upload URL
router.post('/request', verifyToken, validator(requestUpload), async (req: Request, res: Response) => {
  try {
    const { fileName, mimeType, fileSize } = req.body;
    const username = req.user?.username;

    if (!username) {
      res.sendError(401, 'User not authenticated');
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.sendError(404, 'User not found');
      return;
    }

    // Check quota: sum of user's active (non-expired) file sizes
    const activeFiles = await FileUpload.aggregate([
      { $match: { userId: user._id, expiresAt: { $gt: new Date() } } },
      { $group: { _id: null, totalSize: { $sum: '$fileSize' } } },
    ]);

    const currentUsage = activeFiles.length > 0 ? activeFiles[0].totalSize : 0;

    if (currentUsage + fileSize > MAX_QUOTA_BYTES) {
      const remainingMB = Math.max(0, Math.floor((MAX_QUOTA_BYTES - currentUsage) / 1024 / 1024));
      res.sendError(413, `Storage quota exceeded. You have ${remainingMB}MB remaining of 500MB.`);
      return;
    }

    // Generate unique S3 key
    const s3Key = `uploads/${user._id}/${randomUUID()}/${fileName}`;

    // Create FileUpload record
    const expiresAt = new Date(Date.now() + config.upload.fileExpiryHours * 60 * 60 * 1000);
    const fileUpload = new FileUpload({
      userId: user._id,
      username,
      originalName: fileName,
      s3Key,
      mimeType,
      fileSize,
      expiresAt,
    });

    await fileUpload.save();

    // Generate presigned upload URL
    const uploadUrl = await generateUploadUrl(s3Key, mimeType, fileSize);
    const downloadUrl = await generateDownloadUrl(s3Key);

    res.sendResponse(200, {
      uploadUrl,
      fileId: fileUpload._id,
      downloadUrl,
      expiresAt,
    });
  } catch {
    res.sendError(500, 'Failed to create upload request');
  }
});

// GET /upload/:id - Get a fresh download URL for a file
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const fileUpload = await FileUpload.findById(req.params.id);
    if (!fileUpload) {
      res.sendError(404, 'File not found');
      return;
    }

    if (fileUpload.expiresAt < new Date()) {
      res.sendError(410, 'File has expired');
      return;
    }

    const downloadUrl = await generateDownloadUrl(fileUpload.s3Key);

    res.sendResponse(200, {
      downloadUrl,
      fileName: fileUpload.originalName,
      mimeType: fileUpload.mimeType,
      fileSize: fileUpload.fileSize,
      expiresAt: fileUpload.expiresAt,
    });
  } catch {
    res.sendError(500, 'Failed to get download URL');
  }
});

export default router;
