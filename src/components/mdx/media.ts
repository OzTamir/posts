/**
 * media.ts — resolve a post video (and media-dir poster) to a built asset URL.
 *
 * Videos aren't image-optimized by Astro, but importing them still routes
 * them through the build (hashed /_astro URL + long-cache fingerprint) so no
 * raw /content/media literal ships. Like images.ts, we eagerly glob the tree
 * once and look up by path so MDX files need no per-file imports.
 *
 * Returns a URL string (the default export of a non-image asset import).
 */
const videoModules = import.meta.glob<{ default: string }>(
  '/src/assets/content/media/**/*.{mp4,MP4,webm,WEBM,mov,MOV}',
  { eager: true },
);

// Posters that live in the media dir (jpg thumbnails alongside the videos).
const posterModules = import.meta.glob<{ default: string }>(
  '/src/assets/content/media/**/*.{jpg,JPG,jpeg,JPEG,png,PNG}',
  { eager: true },
);

function buildMap(modules: Record<string, { default: string }>) {
  const map = new Map<string, string>();
  for (const [key, mod] of Object.entries(modules)) {
    map.set(key.replace('/src/assets/content/media/', ''), mod.default);
  }
  return map;
}

const videos = buildMap(videoModules);
const posters = buildMap(posterModules);

function toRelPath(path: string): string {
  return path
    .replace(/^\/?content\/media\//, '')
    .replace(/^\/?src\/assets\/content\/media\//, '')
    .replace(/^\//, '');
}

/** Resolve a media-dir video path ("2023/03/x.mp4") to its built URL. */
export function resolveVideo(path: string): string {
  const rel = toRelPath(path);
  const url = videos.get(rel);
  if (!url) {
    throw new Error(`[mdx/media] No video asset for "${path}" (looked up "${rel}").`);
  }
  return url;
}

/** Resolve a media-dir poster image ("2024/07/x_thumb.jpg") to its built URL. */
export function resolveMediaPoster(path: string): string {
  const rel = toRelPath(path);
  const url = posters.get(rel);
  if (!url) {
    throw new Error(`[mdx/media] No poster asset for "${path}" (looked up "${rel}").`);
  }
  return url;
}

/** Like resolveMediaPoster but returns undefined instead of throwing. */
export function tryMediaPoster(path: string): string | undefined {
  return posters.get(toRelPath(path));
}
