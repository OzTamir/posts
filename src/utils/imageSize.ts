/**
 * Build-time image dimension lookup (used only for og:image:width/height).
 *
 * Ghost's <head> advertises the feature image's pixel dimensions. The
 * static export ships the ORIGINAL images under public/content/images/**
 * (no `size/` derivatives), so we read the original's real size at build
 * time with `image-size`. Runs in Node during SSG only; failures degrade
 * gracefully to "no dimensions" so the build never breaks on a missing
 * or unreadable file.
 */
import { imageSize } from 'image-size';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const publicDir = new URL('../../public/', import.meta.url);

export function getImageDimensions(
  publicPath: string,
): { width: number; height: number } | null {
  try {
    const rel = publicPath.replace(/^\//, '');
    const filePath = fileURLToPath(new URL(rel, publicDir));
    const buf = readFileSync(filePath);
    const { width, height } = imageSize(buf);
    if (typeof width === 'number' && typeof height === 'number') {
      return { width, height };
    }
    return null;
  } catch {
    return null;
  }
}
