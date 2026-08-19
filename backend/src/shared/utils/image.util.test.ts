import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sniffImageMimeType, isAllowedImageMimeType } from './image.util.js';

let dir: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kaibil-image-'));
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

/** Writes raw bytes to a temp file and returns its path. */
async function writeFile(name: string, data: Buffer | string): Promise<string> {
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, data);
  return filePath;
}

/** Encodes a real image in the given format via sharp. */
async function writeRealImage(
  name: string,
  format: 'jpeg' | 'png' | 'webp',
): Promise<string> {
  const buffer = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .toFormat(format)
    .toBuffer();
  return writeFile(name, buffer);
}

describe('sniffImageMimeType', () => {
  it('detects a real JPEG', async () => {
    const file = await writeRealImage('real.jpg', 'jpeg');
    expect(await sniffImageMimeType(file)).toBe('image/jpeg');
  });

  it('detects a real PNG', async () => {
    const file = await writeRealImage('real.png', 'png');
    expect(await sniffImageMimeType(file)).toBe('image/png');
  });

  it('detects a real WebP', async () => {
    const file = await writeRealImage('real.webp', 'webp');
    expect(await sniffImageMimeType(file)).toBe('image/webp');
  });

  it('rejects a PHP payload renamed to .jpg', async () => {
    const file = await writeFile('evil.jpg', '<?php system($_GET["c"]); ?>');
    expect(await sniffImageMimeType(file)).toBeNull();
  });

  it('rejects an SVG (scriptable, so never allowed)', async () => {
    const file = await writeFile(
      'evil.svg',
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect(await sniffImageMimeType(file)).toBeNull();
  });

  it('rejects an ELF binary', async () => {
    const file = await writeFile('evil.jpg', Buffer.from([0x7f, 0x45, 0x4c, 0x46]));
    expect(await sniffImageMimeType(file)).toBeNull();
  });

  it('rejects a file that is too short to classify', async () => {
    const file = await writeFile('tiny.jpg', '\xff\xd8');
    expect(await sniffImageMimeType(file)).toBeNull();
  });

  it('rejects an empty file', async () => {
    const file = await writeFile('empty.jpg', '');
    expect(await sniffImageMimeType(file)).toBeNull();
  });

  it('rejects a text file', async () => {
    const file = await writeFile('notes.jpg', 'this is definitely not an image');
    expect(await sniffImageMimeType(file)).toBeNull();
  });

  it('returns null for a missing file instead of throwing', async () => {
    expect(await sniffImageMimeType(path.join(dir, 'nope.jpg'))).toBeNull();
  });

  it('does not accept a truncated JPEG header', async () => {
    const file = await writeFile('trunc.jpg', Buffer.from([0xff, 0xd8]));
    expect(await sniffImageMimeType(file)).toBeNull();
  });
});

describe('isAllowedImageMimeType', () => {
  it('accepts the three supported types', () => {
    expect(isAllowedImageMimeType('image/jpeg')).toBe(true);
    expect(isAllowedImageMimeType('image/png')).toBe(true);
    expect(isAllowedImageMimeType('image/webp')).toBe(true);
  });

  it('rejects everything else', () => {
    for (const mime of ['image/svg+xml', 'image/gif', 'application/x-msdownload', '', 'text/html']) {
      expect(isAllowedImageMimeType(mime)).toBe(false);
    }
  });
});