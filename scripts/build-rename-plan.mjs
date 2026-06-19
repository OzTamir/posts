#!/usr/bin/env node
/**
 * build-rename-plan.mjs — merge asset-map.json (+ optional asset-names.json hints)
 * into rename-plan.json. Sanitises names; deterministic. Site images are not in
 * map.assets (handled separately), so they are never touched here.
 *   node scripts/build-rename-plan.mjs scripts/asset-map.json scripts/asset-names.json > scripts/rename-plan.json
 */
import { readFile } from 'node:fs/promises';
import { extname, basename } from 'node:path';

const [mapPath, namesPath] = process.argv.slice(2);
const map = JSON.parse(await readFile(mapPath, 'utf8'));
let names = {};
try { names = JSON.parse(await readFile(namesPath, 'utf8')); } catch {}

const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image';
const key = (root, rel) => `${root}:${rel}`;
const destFolder = (a) => (a.posts.length === 1 ? `posts/${a.posts[0]}` : 'posts/_shared');

// Structural fields get conventional names; everything else uses the hint (or original basename).
function baseName(a) {
  if (a.kinds.includes('feature')) return 'featured';
  if (a.kinds.includes('og')) return 'og';
  if (a.kinds.includes('twitter')) return 'twitter';
  return slugify(names[key(a.root, a.rel)] || basename(a.rel, extname(a.rel)));
}

const usedByFolder = {};       // `${root}/${dest}` -> Set(name)
const newRelOf = new Map();    // key -> newRel (tree-relative under its root)
for (const a of map.assets) {
  const ext = extname(a.rel).toLowerCase();
  const dest = destFolder(a);
  const base = baseName(a);
  const fkey = `${a.root}/${dest}`;
  usedByFolder[fkey] ??= new Set();
  let name = base, i = 2;
  while (usedByFolder[fkey].has(name)) name = `${base}-${i++}`;
  usedByFolder[fkey].add(name);
  newRelOf.set(key(a.root, a.rel), `${dest}/${name}${ext}`);
}

const moves = map.assets.map((a) => ({
  from: `src/assets/content/${a.root}/${a.rel}`,
  to: `src/assets/content/${a.root}/${newRelOf.get(key(a.root, a.rel))}`,
}));

const editsByFile = {};
const addEdit = (file, find, replace) => { (editsByFile[file] ??= []).push({ find, replace }); };
for (const rec of Object.values(map.posts)) {
  if (rec.featureImage) {
    addEdit(rec.file, `/content/images/${rec.featureImage}`, `/content/images/${newRelOf.get(key('images', rec.featureImage))}`);
  }
  for (const field of ['ogImage', 'twitterImage']) {
    const rel = rec.seoImages?.[field];
    if (!rel) continue;
    addEdit(rec.file, `/content/images/${rel}`, `/content/images/${newRelOf.get(key('images', rel))}`);
  }
  for (const rel of rec.images) addEdit(rec.file, `="${rel}"`, `="${newRelOf.get(key('images', rel))}"`);
  for (const v of rec.videos) {
    if (v.src) addEdit(rec.file, `="${v.src}"`, `="${newRelOf.get(key('media', v.src))}"`);
    if (v.poster && !v.posterMissing) addEdit(rec.file, `="${v.poster}"`, `="${newRelOf.get(key(v.posterRoot, v.poster))}"`);
  }
}

console.log(JSON.stringify({
  moves,
  edits: Object.entries(editsByFile).map(([file, replacements]) => ({ file, replacements })),
}, null, 2));
