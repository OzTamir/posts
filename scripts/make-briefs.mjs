#!/usr/bin/env node
/**
 * make-briefs.mjs — per-post naming briefs for the naming subagents.
 * Reads scripts/asset-map.json, emits scripts/briefs.json:
 *   { <slug>: { title, excerpt, images: [absolute image+poster paths to view] } }
 *   node scripts/make-briefs.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const REPO = process.cwd();
const map = JSON.parse(await readFile(join(REPO, 'scripts/asset-map.json'), 'utf8'));

const grab = (re, s) => { const m = s.match(re); return m ? m[1].replace(/^["']|["']$/g, '').trim() : ''; };

const briefs = {};
for (const [slug, post] of Object.entries(map.posts)) {
  const src = await readFile(join(REPO, post.file), 'utf8');
  const title = grab(/^title:\s*(.+)$/m, src) || slug;
  const excerpt = grab(/^excerpt:\s*(.+)$/m, src);
  const imgRels = [post.featureImage, ...post.images, ...Object.values(post.seoImages || {})].filter(Boolean);
  const imgAbs = imgRels.map((r) => `${REPO}/src/assets/content/images/${r}`);
  const posterAbs = post.videos
    .filter((v) => v.poster && !v.posterMissing)
    .map((v) => `${REPO}/src/assets/content/${v.posterRoot}/${v.poster}`);
  briefs[slug] = { title, excerpt, images: [...new Set([...imgAbs, ...posterAbs])] };
}

await writeFile(join(REPO, 'scripts/briefs.json'), JSON.stringify(briefs, null, 2));
const total = Object.values(briefs).reduce((n, b) => n + b.images.length, 0);
console.log(`wrote briefs for ${Object.keys(briefs).length} posts (${total} images to name)`);
