#!/usr/bin/env node
/**
 * asset-map.mjs — inventory which post references which asset.
 *   node scripts/asset-map.mjs > scripts/asset-map.json
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const POSTS = join(ROOT, 'src/content/posts');
const IMAGES = join(ROOT, 'src/assets/content/images');
const MEDIA = join(ROOT, 'src/assets/content/media');

async function walk(dir) {
  const out = [];
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const stripImg = (r) => r.replace(/^\/?content\/images\//, '').replace(/^\//, '');
const stripMed = (r) => r.replace(/^\/?content\/media\//, '').replace(/^\//, '');
const isRemote = (r) => /^https?:\/\//.test(r);

const postFiles = (await readdir(POSTS)).filter((f) => /\.(mdx|md)$/.test(f));
const posts = {};
const assetRefs = new Map(); // `${root}:${rel}` -> { root, rel, posts:Set, kinds:Set }
const note = (root, rel, slug, kind) => {
  const key = `${root}:${rel}`;
  if (!assetRefs.has(key)) assetRefs.set(key, { root, rel, posts: new Set(), kinds: new Set() });
  const a = assetRefs.get(key);
  a.posts.add(slug); a.kinds.add(kind);
};

for (const file of postFiles) {
  const slug = file.replace(/\.(mdx|md)$/, '');
  const src = await readFile(join(POSTS, file), 'utf8');
  const rec = { file: `src/content/posts/${file}`, featureImage: null, seoImages: {}, images: [], videos: [] };

  const fm = src.match(/^featureImage:\s*["']?([^"'\n]+)["']?\s*$/m);
  if (fm && !isRemote(fm[1].trim())) {
    const rel = stripImg(fm[1].trim());
    rec.featureImage = rel; note('images', rel, slug, 'feature');
  }
  // SEO override image fields in frontmatter (per-post og/twitter cards).
  for (const mm of src.matchAll(/^(ogImage|twitterImage):\s*["']?([^"'\n]+)["']?\s*$/gm)) {
    const field = mm[1], val = mm[2].trim();
    if (isRemote(val)) continue;
    const rel = stripImg(val);
    rec.seoImages[field] = rel;
    note('images', rel, slug, field === 'ogImage' ? 'og' : 'twitter');
  }
  for (const m of src.matchAll(/<Figure\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/g)) {
    if (isRemote(m[1])) continue;
    const rel = stripImg(m[1]); rec.images.push(rel); note('images', rel, slug, 'figure');
  }
  for (const m of src.matchAll(/<Video\b([^>]*)>/g)) {
    const attrs = m[1];
    const s = attrs.match(/\bsrc=["']([^"']+)["']/);
    const p = attrs.match(/\bposter=["']([^"']+)["']/);
    const v = { src: null, poster: null };
    if (s && !isRemote(s[1])) { v.src = stripMed(s[1]); note('media', v.src, slug, 'video'); }
    if (p && !isRemote(p[1])) v.poster = p[1].replace(/^\//, '');
    rec.videos.push(v);
  }
  posts[slug] = rec;
}

const allImages = new Set((await walk(IMAGES)).map((p) => relative(IMAGES, p)));
const allMedia = new Set((await walk(MEDIA)).map((p) => relative(MEDIA, p)));

for (const [slug, rec] of Object.entries(posts)) {
  for (const v of rec.videos) {
    if (!v.poster) continue;
    const med = stripMed(v.poster), img = stripImg(v.poster);
    if (allMedia.has(med)) { note('media', med, slug, 'poster'); v.posterRoot = 'media'; v.poster = med; }
    else if (allImages.has(img)) { note('images', img, slug, 'poster'); v.posterRoot = 'images'; v.poster = img; }
    else v.posterMissing = true;
  }
}

// Site-level brand images (referenced from src/config.ts + src/data/site-images.ts),
// NOT post assets — exclude from orphans and report separately.
const cfg = await readFile(join(ROOT, 'src/config.ts'), 'utf8');
const simg = await readFile(join(ROOT, 'src/data/site-images.ts'), 'utf8');
const site = new Set();
for (const m of cfg.matchAll(/\/content\/images\/([^"'\s)]+\.(?:png|jpe?g|webp|gif))/gi)) site.add(stripImg(m[0]));
for (const m of simg.matchAll(/assets\/content\/images\/([^"'\s)]+\.(?:png|jpe?g|webp|gif))/gi)) site.add(m[1]);

const referenced = { images: new Set(), media: new Set() };
for (const a of assetRefs.values()) referenced[a.root].add(a.rel);
const orphans = {
  images: [...allImages].filter((r) => !referenced.images.has(r) && !site.has(r)),
  media: [...allMedia].filter((r) => !referenced.media.has(r)),
};
const shared = [...assetRefs.values()].filter((a) => a.posts.size > 1)
  .map((a) => ({ root: a.root, rel: a.rel, posts: [...a.posts], kinds: [...a.kinds] }));

console.log(JSON.stringify({
  posts,
  assets: [...assetRefs.values()].map((a) => ({ root: a.root, rel: a.rel, posts: [...a.posts], kinds: [...a.kinds] })),
  site: [...site],
  orphans, shared,
}, null, 2));
