#!/usr/bin/env node
/**
 * merge-names.mjs — build asset-names.json from per-post name files.
 * Reads scripts/asset-map.json and scripts/names/<slug>.json (each { basename: kebab-name }).
 * Emits scripts/asset-names.json keyed by "<root>:<rel>". Videos are named from
 * their poster's name (trailing -thumb/-poster/-preview stripped); the poster
 * becomes "<base>-poster". Missing names are left out (build-rename-plan then
 * falls back to the original basename).
 *   node scripts/merge-names.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const REPO = process.cwd();
const map = JSON.parse(await readFile(join(REPO, 'scripts/asset-map.json'), 'utf8'));

const clean = (s) =>
  String(s).toLowerCase().normalize('NFKD')
    .replace(/\.[a-z0-9]+$/, '')              // drop any extension the model added
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-(thumb|thumbnail|poster|preview|image|img)$/, '')
    .slice(0, 40) || 'image';

const out = {};
let named = 0, missing = 0;
for (const [slug, post] of Object.entries(map.posts)) {
  let pn = {};
  try { pn = JSON.parse(await readFile(join(REPO, 'scripts/names', `${slug}.json`), 'utf8')); } catch {}
  const byBase = {};
  for (const [k, v] of Object.entries(pn)) byBase[basename(k)] = v;
  const look = (rel) => byBase[basename(rel)];

  for (const rel of [post.featureImage, ...post.images].filter(Boolean)) {
    const n = look(rel);
    if (n) { out[`images:${rel}`] = clean(n); named++; } else missing++;
  }
  for (const field of ['ogImage', 'twitterImage']) {
    const rel = post.seoImages?.[field];
    if (!rel) continue;
    const n = look(rel);
    if (n) { out[`images:${rel}`] = clean(n); named++; } else missing++;
  }
  for (const v of post.videos) {
    if (!v.poster || v.posterMissing) continue;
    const n = look(v.poster);
    if (!n) { missing++; continue; }
    const base = clean(n);
    if (v.src) out[`media:${v.src}`] = base;
    out[`${v.posterRoot}:${v.poster}`] = `${base}-poster`;
  }
}

await writeFile(join(REPO, 'scripts/asset-names.json'), JSON.stringify(out, null, 2));
console.log(`wrote ${Object.keys(out).length} names (${named} hits, ${missing} fall back to original basename)`);
