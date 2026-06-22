import { readdir, readFile, mkdir, copyFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const POSTS_DIR = 'src/content/posts';
// A lone Obsidian video embed: ![[clip.mp4|poster=thumb.jpg|title=…]]
const EMBED = /!\[\[([^\]|]+\.(?:mp4|webm|mov))((?:\|[^\]]*)*)\]\]/gi;

function posterOf(tail) {
  for (const part of tail.split('|')) {
    const [k, ...rest] = part.split('=');
    if (k.trim() === 'poster') return rest.join('=').trim();
  }
  return null;
}

/**
 * copy-post-media — emit co-located post videos (and their poster images) to dist.
 *
 * Videos (.mp4/.webm/.mov) and the raw poster images referenced by a `![[…]]`
 * embed are NOT handled by Astro's asset pipeline (it only optimizes markdown
 * <img> nodes), so they can't live as optimized /_astro assets. Rather than
 * split them out into public/, we keep them co-located in the post folder (one
 * source of truth per post) and copy the referenced files into dist/<slug>/ at
 * build time. The video embed renders `src="file.mp4"`, which — because pages
 * are emitted at /<slug>/ — resolves to /<slug>/file.mp4.
 *
 * Register BEFORE strip-image-metadata so copied posters are EXIF-scrubbed too.
 */
export default function copyPostMedia() {
  return {
    name: 'copy-post-media',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distRoot = fileURLToPath(dir);
        let copied = 0;

        let entries;
        try {
          entries = await readdir(POSTS_DIR, { withFileTypes: true });
        } catch {
          return; // no posts dir (shouldn't happen) — nothing to do
        }

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const slug = entry.name;

          let body;
          try {
            body = await readFile(join(POSTS_DIR, slug, 'index.md'), 'utf8');
          } catch {
            continue; // not a folder-based post
          }

          const files = new Set();
          for (const m of body.matchAll(EMBED)) {
            files.add(m[1]); // the video
            const poster = posterOf(m[2] ?? '');
            if (poster) files.add(poster);
          }

          for (const file of files) {
            const src = join(POSTS_DIR, slug, file);
            try {
              await access(src);
            } catch {
              logger.warn(`referenced media missing, skipped: ${src}`);
              continue;
            }
            const destDir = join(distRoot, slug);
            await mkdir(destDir, { recursive: true });
            await copyFile(src, join(destDir, file));
            copied++;
          }
        }

        logger.info(`copied ${copied} co-located post media file(s) into dist`);
      },
    },
  };
}
