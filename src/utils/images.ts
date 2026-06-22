/**
 * images.ts — server-side image optimization for the React components.
 *
 * The chrome (PostLayout header feature image, Head OG/JSON-LD, etc.) is
 * authored in React, which can't use Astro's <Image>. So routes call these
 * helpers in their .astro frontmatter (where getImage works) and pass the
 * resulting URL/srcset strings down as plain props — keeping the React tree
 * static while still shipping optimized /_astro assets (no /content links).
 *
 * Feature images are resolved through the same eager glob the MDX <Figure>
 * uses, so frontmatter keeps its existing "/content/images/..." string paths
 * (no per-post import churn).
 *
 * New folder-based posts use co-located basename paths ("featured.png").
 * Use resolveFeatureImagePath() to normalize before calling optimizeFeatureImage
 * or socialImageUrl.
 */
import { getImage } from 'astro:assets';
import { resolveImage, isGif } from '../components/mdx/images';

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
