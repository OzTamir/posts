/**
 * images.ts — resolve a post image path to its optimized, build-time asset.
 *
 * Post images live under src/assets/content/images/** so they go through
 * Astro's asset pipeline (hashing + WebP/responsive variants). Rather than
 * hand-importing 300+ images across 41 MDX files, we eagerly glob the whole
 * tree once and look up an image by its path. MDX/Figure callers pass either:
 *   • a tree-relative path:  "2023/03/res.png"
 *   • the legacy public path: "/content/images/2023/03/res.png"
 * Both normalize to the same imported ImageMetadata.
 *
 * `eager: true` makes each entry the resolved module synchronously, so the
 * ImageMetadata can be handed straight to <Image> / <img> with no awaiting.
 */
import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/content/images/**/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP,gif,GIF}',
  { eager: true },
);

// Map a tree-relative path ("2023/03/x.png") -> ImageMetadata.
const byRelPath = new Map<string, ImageMetadata>();
for (const [key, mod] of Object.entries(modules)) {
  const rel = key.replace('/src/assets/content/images/', '');
  byRelPath.set(rel, mod.default);
}

/** Normalize any accepted form to the tree-relative key. */
function toRelPath(path: string): string {
  return path
    .replace(/^\/?content\/images\//, '')
    .replace(/^\/?src\/assets\/content\/images\//, '')
    .replace(/^\//, '');
}

/**
 * Resolve an image path to its optimized ImageMetadata.
 * Throws at build time if the asset is missing — a loud failure is far better
 * than silently shipping a broken image (and keeps the "no /content links"
 * guarantee honest).
 */
export function resolveImage(path: string): ImageMetadata {
  const rel = toRelPath(path);
  const found = byRelPath.get(rel);
  if (!found) {
    throw new Error(
      `[mdx/images] No optimized asset for "${path}" (looked up "${rel}" under src/assets/content/images/). ` +
        `Make sure the file was moved into the asset pipeline.`,
    );
  }
  return found;
}

/** Is this an animated GIF? (Imported but NOT re-encoded, to keep animation.) */
export function isGif(img: ImageMetadata): boolean {
  return img.format === 'gif';
}
