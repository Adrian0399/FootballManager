import multer from 'multer';
import type { Request, Response } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { env } from '../../config/env.js';
import { ApiError } from '../errors/api-error.js';
import { isAllowedImageMimeType } from '../utils/image.util.js';

/**
 * Returns the absolute path of the directory where uploads for a given
 * kind ('profile' | 'cover') should be stored.
 * Auto-creates the directory if missing.
 */
export function uploadDirFor(userId: string): string {
  const dir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'users', userId);
  return dir;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      // We'll know the userId only after auth runs, so for now we use a temp
      // folder and move the file in the photo service. Falling back to a
      // shared tmp keeps multer happy without leaking per-user structure.
      const tmpDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'tmp');
      await ensureDir(tmpDir);
      cb(null, tmpDir);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    const random = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${Date.now()}-${random}${ext}`);
  },
});

function fileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (!isAllowedImageMimeType(file.mimetype)) {
    cb(ApiError.badRequest('Only JPEG, PNG or WebP images are allowed', 'INVALID_IMAGE_TYPE'));
    return;
  }
  cb(null, true);
}

export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
  },
}).single('file');

/**
 * Wraps multer to translate its known errors into ApiError so the global
 * error handler can format them as JSON.
 */
export function runUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    uploadSingleImage(req, res, (err: unknown) => {
      if (!err) {
        resolve();
        return;
      }
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          reject(ApiError.badRequest(`File too large (max ${env.MAX_UPLOAD_SIZE_MB}MB)`, 'FILE_TOO_LARGE'));
          return;
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          reject(ApiError.badRequest('Unexpected file field', 'BAD_FIELD'));
          return;
        }
        reject(ApiError.badRequest(err.message, 'UPLOAD_ERROR'));
        return;
      }
      reject(err);
    });
  });
}