/**
 * images.ts — server-side image optimization for the React components.
 *
 * The chrome (PostLayout header feature image, Head OG/JSON-LD, etc.) is
 * authored in React, which can't use Astro's <Image>. So routes call these
 * helpers in their .astro frontmatter (where getImage works) and pass the
 * resulting URL/srcset strings down as plain props — keeping the React tree
 * static while still shipping optimized /_astro assets (no /content links).
 *
 * Feature images are resolved through eager globs over two pools:
 *   1. Legacy images under src/assets/content/images/ (site/ logo/avatar/og;
 *      previously also posts/ but those dirs are now empty after migration).
 *   2. Co-located images under src/content/posts/<slug>/ (new folder-based posts).
 *
 * New folder-based posts use co-located basename paths ("featured.png").
 * Use resolveFeatureImagePath() to normalize before calling optimizeFeatureImage
 * or socialImageUrl.
 */
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

// Legacy images under src/assets/content/images/ (includes site/ sub-dir with
// logo, avatar, og-default, icon — still actively used for site chrome).
const legacyModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/content/images/**/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP,gif,GIF}',
  { eager: true },
);

// Co-located images under src/content/posts/<slug>/
const colocatedModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/posts/**/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP,gif,GIF}',
  { eager: true },
);

// Unified map: tree-relative path → ImageMetadata
const byRelPath = new Map<string, ImageMetadata>();
for (const [key, mod] of Object.entries(legacyModules)) {
  const rel = key.replace('/src/assets/content/images/', '');
  byRelPath.set(rel, mod.default);
}
for (const [key, mod] of Object.entries(colocatedModules)) {
  const rel = key.replace('/src/content/posts/', ''); // "my-slug/featured.png"
  byRelPath.set(rel, mod.default);
  byRelPath.set(`posts/${rel}`, mod.default);
}

function toRelPath(path: string): string {
  return path
    .replace(/^\/?content\/images\//, '')
    .replace(/^\/?src\/assets\/content\/images\//, '')
    .replace(/^\/?src\/content\/posts\//, '')
    .replace(/^\//, '');
}

/**
 * Resolve an image path to its optimized ImageMetadata.
 * For co-located new-format posts, the frontmatter passes only the basename
 * ("featured.png"). The page route is responsible for prefixing the slug to
 * form "<slug>/featured.png" before calling this function.
 *
 * Throws at build time if the asset is missing.
 */
export function resolveImage(path: string): ImageMetadata {
  const rel = toRelPath(path);
  const found = byRelPath.get(rel);
  if (!found) {
    throw new Error(
      `[utils/images] No optimized asset for "${path}" (looked up "${rel}"). ` +
        `Make sure the file is in src/assets/content/images/ or co-located in src/content/posts/<slug>/.`,
    );
  }
  return found;
}

/** Is this an animated GIF? (Imported but NOT re-encoded, to keep animation.) */
export function isGif(img: ImageMetadata): boolean {
  return img.format === 'gif';
}

/**
 * Normalize the feature image path for a post. New folder-based posts use a
 * co-located basename (e.g. "featured.png") — prefix with the post slug so
 * resolveImage can find it via the co-located glob. Legacy posts use a full
 * path already (contains "/" or "http").
 */
export function resolveFeatureImagePath(
  slug: string,
  imagePath: string | null | undefined,
): string | null | undefined {
  if (!imagePath) return imagePath;
  // Co-located basename: no directory separator and not a URL.
  if (!imagePath.includes('/') && !imagePath.startsWith('http')) {
    return `${slug}/${imagePath}`;
  }
  return imagePath;
}

export interface OptimizedImage {
  /** Optimized (or, for GIFs, original) asset URL — a hashed /_astro path. */
  src: string;
  /** Responsive srcset string (empty for GIFs / single-width). */
  srcset: string;
  /** Intrinsic width/height (from the source asset). */
  width: number;
  height: number;
}

/**
 * Optimize a feature/content image referenced by path.
 * Non-GIFs become WebP with a responsive srcset; GIFs are passed through as
 * their hashed original (animation preserved). Returns null for a falsy path.
 */
export async function optimizeFeatureImage(
  path?: string | null,
): Promise<OptimizedImage | null> {
  if (!path) return null;
  // Remote images can't be locally optimized — hand them straight back.
  if (/^https?:\/\//.test(path)) return null;

  const asset = resolveImage(path);

  if (isGif(asset)) {
    return { src: asset.src, srcset: '', width: asset.width, height: asset.height };
  }

  const widths = [480, 768, 1024, 1600, asset.width].filter(
    (w, i, arr) => w <= asset.width && arr.indexOf(w) === i,
  );
  const img = await getImage({ src: asset, format: 'webp', widths, layout: 'constrained' });
  return {
    src: img.src,
    srcset: img.srcSet?.attribute ?? '',
    width: asset.width,
    height: asset.height,
  };
}

/**
 * Resolve a feature/content image to a single absolute optimized URL for use
 * as an Open Graph / Twitter / JSON-LD image (social scrapers want one image,
 * not a srcset). Returns the absolute https URL, or null.
 */
export async function socialImageUrl(
  siteUrl: string,
  path?: string | null,
  format: 'jpeg' | 'png' = 'jpeg',
): Promise<{ url: string; width: number; height: number } | null> {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return { url: path, width: 0, height: 0 };

  const asset = resolveImage(path);
  // Social scrapers (Facebook, LinkedIn) don't reliably render WebP, so emit a
  // widely-supported raster: JPEG for photographic feature images (small, well
  // under platform size limits), PNG for brand art that needs transparency.
  // GIFs: use the hashed original.
  const optimized = isGif(asset)
    ? { src: asset.src }
    : await getImage({
        src: asset,
        format,
        ...(format === 'jpeg' ? { quality: 82 } : {}),
        width: Math.min(asset.width, 1600),
      });
  const rel = optimized.src;
  return {
    url: rel.startsWith('http') ? rel : `${siteUrl}${rel}`,
    width: Math.min(asset.width, 1600),
    height: Math.round((Math.min(asset.width, 1600) / asset.width) * asset.height),
  };
}
