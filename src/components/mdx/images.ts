/**
 * images.ts — resolve a post image path to its optimized, build-time asset.
 *
 * Legacy posts: images live under src/assets/content/images/** (go through
 * Astro's asset pipeline). New folder-based posts: images are co-located under
 * src/content/posts/<slug>/**. Both pools are eagerly globbed and merged into
 * a single lookup map. Callers pass either:
 *   • a tree-relative path (legacy):  "posts/slug/res.png"
 *   • the legacy public path:          "/content/images/posts/slug/res.png"
 *   • a basename (new co-located):     "featured.png"  — looked up by slug+basename
 * All forms normalize to the same imported ImageMetadata.
 *
 * `eager: true` makes each entry the resolved module synchronously, so the
 * ImageMetadata can be handed straight to <Image> / <img> with no awaiting.
 */
import type { ImageMetadata } from 'astro';

// Legacy images under src/assets/content/images/
const legacyModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/content/images/**/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP,gif,GIF}',
  { eager: true },
);

// New co-located images under src/content/posts/<slug>/
const colocatedModules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/posts/**/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP,gif,GIF}',
  { eager: true },
);

// Map a tree-relative path ("posts/slug/x.png") -> ImageMetadata.
const byRelPath = new Map<string, ImageMetadata>();
for (const [key, mod] of Object.entries(legacyModules)) {
  const rel = key.replace('/src/assets/content/images/', '');
  byRelPath.set(rel, mod.default);
}
// Map co-located images by their slug/basename ("slug/featured.png") AND by
// just the basename ("featured.png") — the frontmatter `image:` field uses basenames.
// We also store the full path so callers using "posts/slug/file.png" still resolve.
for (const [key, mod] of Object.entries(colocatedModules)) {
  // e.g. key = "/src/content/posts/my-slug/featured.png"
  const rel = key.replace('/src/content/posts/', '');      // "my-slug/featured.png"
  byRelPath.set(rel, mod.default);
  // Also store under "posts/my-slug/featured.png" for any callers using that form.
  byRelPath.set(`posts/${rel}`, mod.default);
}

/** Normalize any accepted form to the tree-relative key. */
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
 * Throws at build time if the asset is missing — a loud failure is far better
 * than silently shipping a broken image.
 */
export function resolveImage(path: string): ImageMetadata {
  const rel = toRelPath(path);
  const found = byRelPath.get(rel);
  if (!found) {
    throw new Error(
      `[mdx/images] No optimized asset for "${path}" (looked up "${rel}"). ` +
        `Make sure the file is in src/assets/content/images/ or co-located in src/content/posts/<slug>/.`,
    );
  }
  return found;
}

/** Is this an animated GIF? (Imported but NOT re-encoded, to keep animation.) */
export function isGif(img: ImageMetadata): boolean {
  return img.format === 'gif';
}
