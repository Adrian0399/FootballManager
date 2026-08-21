import path from 'node:path';
import fs from 'node:fs/promises';
import { prisma } from '../../shared/prisma/prisma.client.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { env } from '../../config/env.js';
import { processCoverPhoto, processProfilePhoto, sniffImageMimeType } from '../../shared/utils/image.util.js';
import { uploadDirFor } from '../../shared/middlewares/upload.middleware.js';
import { publicUrlFor } from '../../shared/utils/user.util.js';
import { usersService } from './users.service.js';

const PROFILE_FILENAME = 'profile.webp';
const COVER_FILENAME = 'cover.webp';

/**
 * Rejects uploads whose bytes are not actually a supported image.
 * Always deletes the temp file so a rejected upload leaves nothing behind.
 */
async function assertRealImage(tempFilePath: string, label: string): Promise<void> {
  const sniffed = await sniffImageMimeType(tempFilePath).catch(() => null);
  if (!sniffed) {
    await fs.unlink(tempFilePath).catch(() => undefined);
    throw ApiError.badRequest(
      `The uploaded file is not a valid image (expected JPEG, PNG or WebP). ${label} rejected.`,
      'INVALID_IMAGE_CONTENT',
    );
  }
}

export const photoService = {
  async uploadProfilePhoto(userId: string, tempFilePath: string): Promise<{ profilePhotoUrl: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

    const userDir = uploadDirFor(userId);
    await fs.mkdir(userDir, { recursive: true });
    const finalPath = path.join(userDir, PROFILE_FILENAME);

    // Verify the bytes really are an image: the request's Content-Type is
    // client-controlled and proves nothing.
    await assertRealImage(tempFilePath, 'profile photo');

    try {
      await processProfilePhoto(tempFilePath, finalPath);
    } catch {
      throw ApiError.internal('Failed to process profile photo', 'IMAGE_PROCESS_FAILED');
    } finally {
      await fs.unlink(tempFilePath).catch(() => undefined);
    }

    const relativePath = `users/${userId}/${PROFILE_FILENAME}`;
    await prisma.user.update({
      where: { id: userId },
      data: {
        profilePhotoPath: relativePath,
        updatedById: userId,
      },
    });

    return { profilePhotoUrl: publicUrlFor(relativePath) as string };
  },

  async deleteProfilePhoto(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

    if (user.profilePhotoPath) {
      const onDisk = path.resolve(process.cwd(), env.UPLOAD_DIR, user.profilePhotoPath);
      await fs.unlink(onDisk).catch(() => undefined);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { profilePhotoPath: null, updatedById: userId },
    });
  },

  async uploadCoverPhoto(userId: string, tempFilePath: string): Promise<{ coverPhotoUrl: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

    const userDir = uploadDirFor(userId);
    await fs.mkdir(userDir, { recursive: true });
    const finalPath = path.join(userDir, COVER_FILENAME);

    await assertRealImage(tempFilePath, 'cover photo');

    try {
      await processCoverPhoto(tempFilePath, finalPath);
    } catch {
      throw ApiError.internal('Failed to process cover photo', 'IMAGE_PROCESS_FAILED');
    } finally {
      await fs.unlink(tempFilePath).catch(() => undefined);
    }

    const relativePath = `users/${userId}/${COVER_FILENAME}`;
    await prisma.user.update({
      where: { id: userId },
      data: {
        coverPhotoPath: relativePath,
        updatedById: userId,
      },
    });

    return { coverPhotoUrl: publicUrlFor(relativePath) as string };
  },

  async deleteCoverPhoto(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

    if (user.coverPhotoPath) {
      const onDisk = path.resolve(process.cwd(), env.UPLOAD_DIR, user.coverPhotoPath);
      await fs.unlink(onDisk).catch(() => undefined);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { coverPhotoPath: null, updatedById: userId },
    });
  },

  /**
   * Re-reads the current user from the DB and returns it with absolute URLs.
   * Used by photo endpoints so the frontend can sync its auth store.
   */
  async getUserWithUrls(userId: string) {
    return usersService.findById(userId);
  },
};