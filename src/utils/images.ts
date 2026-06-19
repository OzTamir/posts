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
 */
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { resolveImage, isGif } from '../components/mdx/images';

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
 *
 * Accepts either a path string (frontmatter "/content/images/..." or
 * tree-relative — resolved through the asset glob) OR an already-imported
 * `ImageMetadata` (e.g. `SITE_IMAGES.ogDefault`), so brand imagery can stay a
 * single imported source instead of a duplicated path literal.
 */
export async function socialImageUrl(
  siteUrl: string,
  source?: string | ImageMetadata | null,
): Promise<{ url: string; width: number; height: number } | null> {
  if (!source) return null;
  if (typeof source === 'string' && /^https?:\/\//.test(source)) {
    return { url: source, width: 0, height: 0 };
  }

  // String paths go through the asset glob; an ImageMetadata is used as-is.
  const asset = typeof source === 'string' ? resolveImage(source) : source;
  // GIFs: use the hashed original; otherwise a single large WebP.
  const optimized = isGif(asset)
    ? { src: asset.src }
    : await getImage({ src: asset, format: 'webp', width: Math.min(asset.width, 1600) });
  const rel = optimized.src;
  return {
    url: rel.startsWith('http') ? rel : `${siteUrl}${rel}`,
    width: Math.min(asset.width, 1600),
    height: Math.round((Math.min(asset.width, 1600) / asset.width) * asset.height),
  };
}
