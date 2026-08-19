import sharp from 'sharp';
import fs from 'node:fs/promises';

/** Square output for avatar-style profile photos. */
const PROFILE_SIZE = 512;

/** 3:1 banner, sized down from a 1500x500 design canvas. */
const COVER_WIDTH = 1500;
const COVER_HEIGHT = 500;

/**
 * Processes a profile photo: square crop, resize, and convert to webp.
 * - Input: any common image format (jpeg, png, webp, gif — first frame).
 * - Output: webp, square, max 512x512, quality 85, metadata stripped.
 */
export async function processProfilePhoto(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .rotate() // honour EXIF orientation
    .resize(PROFILE_SIZE, PROFILE_SIZE, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 85 })
    .toFile(outputPath);
}

/**
 * Processes a cover photo: resize to 3:1 banner, convert to webp.
 * - Output: webp, exactly 1500x500, quality 85, metadata stripped.
 */
export async function processCoverPhoto(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .rotate() // honour EXIF orientation
    .resize(COVER_WIDTH, COVER_HEIGHT, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 85 })
    .toFile(outputPath);
}

/** Allowed mime types for upload validation. */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export function isAllowedImageMimeType(value: string): value is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * Magic-byte signatures for the allowed formats.
 *
 * The `Content-Type` a client sends is just a string it chose, so it proves
 * nothing — a PHP or SVG payload can be posted as `image/jpeg`. These are the
 * first bytes of the actual file, which sharp then re-encodes to webp anyway
 * (so nothing user-controlled is ever served back as-is).
 */
const MAGIC_BYTES: ReadonlyArray<{
  mime: AllowedImageMimeType;
  // Byte offsets are sparse so we don't allocate a buffer per format.
  bytes: ReadonlyArray<readonly [number, number]>;
}> = [
  { mime: 'image/jpeg', bytes: [[0, 0xff], [1, 0xd8], [2, 0xff]] },
  { mime: 'image/png', bytes: [[0, 0x89], [1, 0x50], [2, 0x4e], [3, 0x47]] },
  {
    mime: 'image/webp',
    bytes: [
      [0, 0x52],
      [1, 0x49],
      [2, 0x46],
      [3, 0x46],
      [8, 0x57],
      [9, 0x45],
      [10, 0x42],
      [11, 0x50],
    ],
  },
];

/**
 * Sniffs the real image type from the file's magic bytes.
 * Returns null when the file is not one of the allowed images.
 */
export async function sniffImageMimeType(
  filePath: string,
): Promise<AllowedImageMimeType | null> {
  let handle;
  try {
    handle = await fs.open(filePath, 'r');
  } catch {
    // Missing/unreadable file: treat as "not a valid image" rather than
    // throwing, so callers can use this as a simple gate.
    return null;
  }
  try {
    const { size } = await handle.stat();
    // Every signature we check fits in the first 12 bytes.
    if (size < 12) return null;
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, 12, 0);
    for (const { mime, bytes } of MAGIC_BYTES) {
      if (bytes.every(([offset, value]) => buffer[offset] === value)) return mime;
    }
    return null;
  } finally {
    await handle.close();
  }
}