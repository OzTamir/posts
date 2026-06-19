# Per-Post Asset Restructure, Rename, and EXIF Stripping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. NOTE: the naming tasks (A3/A4) require the *orchestrator* to dispatch Haiku subagents, so **inline execution is the better fit** for this plan.

**Goal:** Move every post asset into per-post folders with short descriptive filenames, and guarantee no EXIF/GPS metadata ships in the build.

**Architecture:** Three Node scripts do the mechanical work — `asset-map.mjs` (inventory references), `build-rename-plan.mjs` (merge inventory + chosen names into an explicit move/edit plan, sanitising names), `apply-renames.mjs` (execute `git mv` + reference rewrites). Names come from per-post **Haiku** subagents that view the images. EXIF is handled by a one-time `exiftool` source scrub plus an `astro:build:done` integration that strips metadata from emitted `dist` rasters. The production build (`resolveImage` throws on any missing reference) is the safety net.

**Tech Stack:** Node ESM scripts, Astro 6 integrations, `sharp` (metadata read/strip), `exiftool` (source scrub), Haiku subagents via the Agent tool.

## Global Constraints

- Static Astro site; `npm run build` must succeed → `./dist`; `npm run check` stays at 0 errors; `npm run check:links` passes. (verbatim from AGENTS.md)
- No emitted asset may exceed **25 MiB** (Cloudflare Workers limit).
- Keep the established look; do not redesign. Zero client JS.
- Asset roots: images under `src/assets/content/images/`, videos+posters under `src/assets/content/media/`. Resolvers glob `**` and look up by tree-relative path — **do not change resolver code**.
- New layout: `…/images/posts/<slug>/<name>.<ext>`, feature image → `…/images/posts/<slug>/featured.<ext>`, videos → `…/media/posts/<slug>/<name>.<ext>`. `<slug>` = MDX filename without extension.
- Reference forms to emit: `featureImage` → `/content/images/posts/<slug>/featured.<ext>`; `<Figure>/<Video>/poster` → tree-relative `posts/<slug>/<name>.<ext>`.
- Filenames: lowercase kebab-case, ≤ ~40 chars.
- EXIF scope: strip images (build-time + source scrub). Videos test clean; not scrubbed.
- Branch: `chore/asset-rename-and-exif` (already created, based on the deploy-fix tip).
- Scratch artifacts (`scripts/asset-map.json`, `asset-names.json`, `rename-plan.json`) are intermediate; they are git-ignored, not committed.

---

## Task A1: Asset inventory script

**Files:**
- Create: `scripts/asset-map.mjs`
- Create/append: `.gitignore` (ignore `scripts/*.json` working files)

**Interfaces:**
- Produces `scripts/asset-map.json` with shape:
  `{ posts: { <slug>: { file, featureImage, images:[rel], videos:[{src,poster,posterRoot,posterMissing}] } }, assets:[{root:'images'|'media', rel, posts:[slug], kinds:[string] }], orphans:{images:[rel],media:[rel]}, shared:[{root,rel,posts,kinds}] }`

- [ ] **Step 1: Write `scripts/asset-map.mjs`**

```js
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
  const rec = { file: `src/content/posts/${file}`, featureImage: null, images: [], videos: [] };

  const fm = src.match(/^featureImage:\s*["']?([^"'\n]+)["']?\s*$/m);
  if (fm && !isRemote(fm[1].trim())) {
    const rel = stripImg(fm[1].trim());
    rec.featureImage = rel; note('images', rel, slug, 'feature');
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

for (const rec of Object.values(posts)) {
  for (const v of rec.videos) {
    if (!v.poster) continue;
    const med = stripMed(v.poster), img = stripImg(v.poster);
    if (allMedia.has(med)) { note('media', med, Object.keys(posts).find((s)=>posts[s]===rec), 'poster'); v.posterRoot='media'; v.poster=med; }
    else if (allImages.has(img)) { note('images', img, Object.keys(posts).find((s)=>posts[s]===rec), 'poster'); v.posterRoot='images'; v.poster=img; }
    else v.posterMissing = true;
  }
}

const referenced = { images: new Set(), media: new Set() };
for (const a of assetRefs.values()) referenced[a.root].add(a.rel);
const orphans = {
  images: [...allImages].filter((r) => !referenced.images.has(r)),
  media: [...allMedia].filter((r) => !referenced.media.has(r)),
};
const shared = [...assetRefs.values()].filter((a) => a.posts.size > 1)
  .map((a) => ({ root: a.root, rel: a.rel, posts: [...a.posts], kinds: [...a.kinds] }));

console.log(JSON.stringify({
  posts,
  assets: [...assetRefs.values()].map((a) => ({ root: a.root, rel: a.rel, posts: [...a.posts], kinds: [...a.kinds] })),
  orphans, shared,
}, null, 2));
```

- [ ] **Step 2: Ignore working JSON files**

Append to `.gitignore`:

```
# asset-migration working files
scripts/asset-map.json
scripts/asset-names.json
scripts/rename-plan.json
```

- [ ] **Step 3: Run it and eyeball the output**

Run: `node scripts/asset-map.mjs > scripts/asset-map.json && node -e "const m=require('./scripts/asset-map.json');console.log('posts',Object.keys(m.posts).length,'assets',m.assets.length,'orphans',m.orphans.images.length+m.orphans.media.length,'shared',m.shared.length)"`
Expected: ~41 posts, a few hundred assets, some orphan count, small shared count. No crash.

- [ ] **Step 4: CHECKPOINT — review orphans + shared with the user**

Print the orphan and shared lists:
Run: `node -e "const m=require('./scripts/asset-map.json');console.log('ORPHANS:\n'+[...m.orphans.images.map(r=>'images/'+r),...m.orphans.media.map(r=>'media/'+r)].join('\n')+'\n\nSHARED:\n'+m.shared.map(s=>s.root+'/'+s.rel+' <- '+s.posts.join(', ')).join('\n'))"`
Present both lists. Get the user's decision: which orphans to **delete** vs **keep** (kept orphans go to `images/posts/_unsorted/`), and confirm shared assets route to `posts/_shared/`. Record decisions for Task A5.

- [ ] **Step 5: Commit the script**

```bash
git add scripts/asset-map.mjs .gitignore
git commit -m "chore(assets): add asset-map inventory script"
```

---

## Task A2: Rename-plan builder + applier

**Files:**
- Create: `scripts/build-rename-plan.mjs`
- Create: `scripts/apply-renames.mjs`

**Interfaces:**
- `build-rename-plan.mjs` consumes `scripts/asset-map.json` + optional `scripts/asset-names.json` (`{ "<root>:<rel>": "<hint-name>" }`), produces `scripts/rename-plan.json` = `{ moves:[{from,to}], edits:[{file, replacements:[{find,replace}]}] }`. It sanitises names (kebab, dedupe per folder, forces feature → `featured`, falls back to original basename when no hint).
- `apply-renames.mjs` consumes `rename-plan.json`, runs `git mv` + string replacements. Accepts `--only <slug>` to scope to one post folder.

- [ ] **Step 1: Write `scripts/build-rename-plan.mjs`**

```js
#!/usr/bin/env node
/**
 * build-rename-plan.mjs — merge asset-map.json (+ optional asset-names.json hints)
 * into rename-plan.json. Sanitises names; deterministic.
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

const usedByFolder = {};            // `${root}/${dest}` -> Set(name)
const newRelOf = new Map();         // key -> newRel (tree-relative under its root)
for (const a of map.assets) {
  const ext = extname(a.rel).toLowerCase();
  const dest = destFolder(a);
  let base = a.kinds.includes('feature') ? 'featured' : slugify(names[key(a.root, a.rel)] || basename(a.rel, extname(a.rel)));
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
    const nr = newRelOf.get(key('images', rec.featureImage));
    addEdit(rec.file, `/content/images/${rec.featureImage}`, `/content/images/${nr}`);
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
```

- [ ] **Step 2: Write `scripts/apply-renames.mjs`**

```js
#!/usr/bin/env node
/**
 * apply-renames.mjs — execute rename-plan.json (git mv + MDX edits).
 *   node scripts/apply-renames.mjs scripts/rename-plan.json [--only <slug>]
 * Re-runnable: skips a move whose source is gone and target already exists.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const planPath = process.argv[2];
const oi = process.argv.indexOf('--only');
const only = oi > -1 ? process.argv[oi + 1] : null;
const scope = only ? `posts/${only}/` : null;
const plan = JSON.parse(await readFile(planPath, 'utf8'));
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

let moved = 0;
for (const { from, to } of plan.moves) {
  if (scope && !to.includes(scope)) continue;
  if (!(await exists(from))) { if (await exists(to)) continue; console.warn(`SKIP missing: ${from}`); continue; }
  await mkdir(dirname(to), { recursive: true });
  execFileSync('git', ['mv', from, to]);
  moved++;
}
let edits = 0;
for (const { file, replacements } of plan.edits) {
  let text = await readFile(file, 'utf8'); let changed = false;
  for (const { find, replace } of replacements) {
    if (scope && !replace.includes(scope)) continue;
    if (text.includes(find)) { text = text.split(find).join(replace); changed = true; edits++; }
  }
  if (changed) await writeFile(file, text);
}
console.log(`moved ${moved} files, applied ${edits} edits`);
```

- [ ] **Step 3: Sanity dry-run of the plan builder (no names yet → fallback names)**

Run: `node scripts/build-rename-plan.mjs scripts/asset-map.json scripts/asset-names.json > scripts/rename-plan.json; node -e "const p=require('./scripts/rename-plan.json');console.log('moves',p.moves.length,'edited files',p.edits.length);console.log(p.moves.slice(0,3))"`
Expected: move count ≈ asset count; sample `from`/`to` look correct (`…/posts/<slug>/<name>.<ext>`). No crash.

- [ ] **Step 4: Commit the scripts**

```bash
git add scripts/build-rename-plan.mjs scripts/apply-renames.mjs
git commit -m "chore(assets): add rename-plan builder and applier scripts"
```

---

## Task A3: Name + migrate the CHECKPOINT post

Pick the first checkpoint post: a content-rich post whose assets are **not** shared (e.g. `lumos-adventures-with-esp32-and-home-assistant` — it has images + the 3 converted videos + posters, and no shared assets). Confirm via `asset-map.json` that none of its assets appear in `shared`.

**Files:**
- Modify: `scripts/asset-names.json` (orchestrator writes Haiku results)
- Modify: the checkpoint post MDX + its assets (via `apply-renames.mjs --only <slug>`)

**Interfaces:**
- Consumes `asset-map.json`. Produces `asset-names.json` entries `{ "images:<rel>": "<name>", "media:<rel>": "<name>" }`.

- [ ] **Step 1: Gather the checkpoint post's image list**

Run (replace SLUG): `node -e "const m=require('./scripts/asset-map.json');const s='SLUG';const p=m.posts[s];const imgs=[p.featureImage,...p.images].filter(Boolean);console.log(JSON.stringify({title_hint:s,images:imgs.map(r=>'src/assets/content/images/'+r)},null,2))"`
This lists absolute image paths to name. (Videos handled in Step 3.)

- [ ] **Step 2: Dispatch a Haiku subagent to name the images**

Use the Agent tool with `model: haiku`, `subagent_type: general-purpose`. Prompt template:

```
You are naming image files for a blog post titled "<POST TITLE>".
For EACH image path below, open it with the Read tool, look at it, and choose a SHORT
descriptive filename: lowercase kebab-case, 2-4 words, no extension, describing what the
image shows (e.g. "breadboard-wiring", "esphome-yaml-config", "lamp-dimming-demo").
Images:
- <abs path 1>
- <abs path 2>
...
Return ONLY a compact JSON object mapping each given absolute path to its chosen name.
Example: {"/repo/src/assets/content/images/2022/06/x.png":"breadboard-wiring"}
No prose, no code fences.
```

Parse the returned JSON. Convert each absolute path back to a `"images:<rel>"` key (strip the `src/assets/content/images/` prefix). The feature image's value is ignored later (forced to `featured`), but include it.

- [ ] **Step 3: Name the post's video(s) + poster(s) directly**

Videos can't be viewed by Haiku. For each video in `m.posts[SLUG].videos`, choose a short kebab name from the surrounding MDX context (read the post), and name its poster `<videoname>-poster`. Write entries:
`"media:<videoRel>": "<name>"`, and for the poster `"<posterRoot>:<posterRel>": "<name>-poster"`.

- [ ] **Step 4: Write `scripts/asset-names.json`**

Merge Steps 2–3 into `scripts/asset-names.json` (create it). It may contain only the checkpoint post's assets for now.

- [ ] **Step 5: Build the plan and apply it to the checkpoint post only**

```bash
node scripts/build-rename-plan.mjs scripts/asset-map.json scripts/asset-names.json > scripts/rename-plan.json
node scripts/apply-renames.mjs scripts/rename-plan.json --only SLUG
```
Expected: `moved N files, applied M edits` with N = that post's asset count.

- [ ] **Step 6: Build + render to verify nothing broke**

Run: `npm run build 2>&1 | tail -5`
Expected: "Complete!" and 128 pages. A missing reference would throw `[mdx/images] No optimized asset for …` — if so, fix the offending edit/move and rebuild.

- [ ] **Step 7: CHECKPOINT — show the user**

Show the renamed tree for the post and the diff of its MDX:
Run: `ls -1 src/assets/content/images/posts/SLUG/ src/assets/content/media/posts/SLUG/ 2>/dev/null; echo '---'; git -P diff -- src/content/posts/SLUG.mdx`
Ask the user to confirm the naming style and folder layout before the bulk run. Incorporate any style feedback (it becomes guidance in the Step 2 prompt for the rest).

- [ ] **Step 8: Commit the checkpoint post**

```bash
git add -A
git commit -m "chore(assets): restructure+rename assets for SLUG (checkpoint)"
```

---

## Task A4: Name + migrate all remaining posts

**Files:**
- Modify: `scripts/asset-names.json` (extend with all remaining posts)
- Modify: remaining post MDX files + their assets

- [ ] **Step 1: Name every remaining post's images via Haiku subagents (batched)**

For each remaining post, repeat Task A3 Steps 1–4 (gather images → Haiku name → name videos/posters → merge into `scripts/asset-names.json`). Dispatch agents in parallel batches (e.g. 5-8 posts at a time — multiple Agent tool calls in one message) to keep it fast/cheap. Apply any naming-style guidance from the A3 checkpoint. Skip `shared` assets here (handled in A5).

- [ ] **Step 2: Build the full plan and apply it to everything**

```bash
node scripts/build-rename-plan.mjs scripts/asset-map.json scripts/asset-names.json > scripts/rename-plan.json
node scripts/apply-renames.mjs scripts/rename-plan.json
```
Expected: `moved …` covering all single-post assets (shared assets move to `posts/_shared/` and get rewritten in every referencing post — that is fine).

- [ ] **Step 3: Full verification**

```bash
npm run build  2>&1 | tail -5     # must reach "Complete!"; throws on any missing ref
npm run check  2>&1 | tail -4     # 0 errors
npm run check:links 2>&1 | tail -8
```
Fix any thrown missing-asset reference (locate the stale ref, correct it, rebuild) until all three pass.

- [ ] **Step 4: Confirm no oversized asset slipped in + sizes sane**

Run: `find dist -type f -size +24M -print | head; echo "(empty above = OK)"`

- [ ] **Step 5: Commit the bulk migration**

```bash
git add -A
git commit -m "chore(assets): restructure all post assets into per-post folders with descriptive names"
```

---

## Task A5: Shared/orphans + cleanup

**Files:**
- Modify: shared-asset references (already routed to `posts/_shared/` by A4); orphan files
- Modify: `src/content.config.ts`, `src/components/mdx/images.ts` (stale comments)
- Delete: now-empty `images/YYYY/MM` + `media/YYYY/MM` dirs

- [ ] **Step 1: Resolve orphans per the user's A1 decision**

For orphans to DELETE: `git rm <files>`. For orphans to KEEP: `git mv` each into `src/assets/content/images/posts/_unsorted/` (or `media/posts/_unsorted/`). (Orphans are unreferenced, so no MDX edits needed.)

- [ ] **Step 2: Verify shared assets resolved**

Run: `ls -1 src/assets/content/images/posts/_shared/ src/assets/content/media/posts/_shared/ 2>/dev/null || echo "(no shared)"`
Confirm each `shared` entry from `asset-map.json` now lives in `_shared/` and every referencing post points at it (the build in Step 6 confirms).

- [ ] **Step 3: Remove emptied date directories**

Run: `find src/assets/content/images src/assets/content/media -type d -empty -delete`

- [ ] **Step 4: Fix stale comments**

In `src/content.config.ts`, update the lines that claim images are "referenced by path … and served verbatim from /public — no build-time transforms" to reflect the per-post `src/assets` pipeline, and change the `featureImage` example to `/content/images/posts/<slug>/featured.png`. In `src/components/mdx/images.ts`, fix any comment implying `/public` serving.

- [ ] **Step 5: Verify + commit**

```bash
npm run build 2>&1 | tail -5 && npm run check:links 2>&1 | tail -5
git add -A
git commit -m "chore(assets): resolve shared/orphan assets, prune empty dirs, fix stale comments"
```

---

## Task B1: EXIF source scrub

**Files:**
- Create: `scripts/scan-exif.mjs`
- Modify (in place, metadata only): `src/assets/content/images/**` raster files

- [ ] **Step 1: Write `scripts/scan-exif.mjs` (verifier, reused for dist later)**

```js
#!/usr/bin/env node
/** scan-exif.mjs <dir> — exit 1 if any raster carries EXIF/XMP/IPTC. */
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const dir = process.argv[2];
const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp']);
async function walk(d) {
  const o = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) o.push(...(await walk(p)));
    else o.push(p);
  }
  return o;
}
const files = (await walk(dir)).filter((f) => RASTER.has(extname(f).toLowerCase()));
let bad = 0;
for (const f of files) {
  const m = await sharp(await readFile(f)).metadata();
  if (m.exif || m.xmp || m.iptc) { bad++; console.log(`META: ${f}`); }
}
console.log(`scanned ${files.length}, with-metadata ${bad}`);
process.exit(bad ? 1 : 0);
```

- [ ] **Step 2: Confirm the leak exists pre-scrub**

Run: `node scripts/scan-exif.mjs src/assets/content/images | tail -5`
Expected: `with-metadata` ≥ 1 (includes the NFC feature image), exit 1.

- [ ] **Step 3: Install exiftool + scrub source images**

```bash
brew install exiftool
exiftool -all= -overwrite_original -r -ext png -ext jpg -ext jpeg -ext webp src/assets/content/images
```
Expected: exiftool reports "N image files updated".

- [ ] **Step 4: Verify sources are clean**

Run: `node scripts/scan-exif.mjs src/assets/content/images | tail -3`
Expected: `with-metadata 0`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A scripts/scan-exif.mjs src/assets/content/images
git commit -m "chore(assets): strip EXIF/GPS metadata from source images"
```

---

## Task B2: Build-time metadata-strip integration

**Files:**
- Create: `src/integrations/strip-image-metadata.mjs`
- Modify: `astro.config.mjs` (register integration)
- Modify: `package.json` (add `sharp` devDependency)

**Interfaces:**
- Default export: an Astro integration factory `stripImageMetadata()` with an `astro:build:done` hook.

- [ ] **Step 1: Add `sharp` as an explicit devDependency**

```bash
npm install -D sharp
```
Expected: `package.json` gains `sharp` under devDependencies; install succeeds.

- [ ] **Step 2: Write `src/integrations/strip-image-metadata.mjs`**

```js
/**
 * strip-image-metadata — Astro integration.
 * After build, strip EXIF/XMP/IPTC from emitted raster images in dist so no
 * location/camera metadata ships. Skips files that carry none (fast) and GIFs
 * (the format has no EXIF/GPS). A backstop on top of the source scrub.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp']);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

export default function stripImageMetadata() {
  return {
    name: 'strip-image-metadata',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = new URL(dir).pathname;
        const files = (await walk(outDir)).filter((f) => RASTER.has(extname(f).toLowerCase()));
        let stripped = 0;
        for (const file of files) {
          const buf = await readFile(file);
          const meta = await sharp(buf).metadata();
          if (!meta.exif && !meta.xmp && !meta.iptc) continue; // already clean (ICC kept, not sensitive)
          const ext = extname(file).toLowerCase();
          const s = sharp(buf); // sharp drops metadata unless withMetadata() is called
          const out = await (ext === '.png' ? s.png() : ext === '.webp' ? s.webp() : s.jpeg()).toBuffer();
          await writeFile(file, out);
          stripped++;
        }
        logger.info(`strip-image-metadata: stripped ${stripped} image(s)`);
      },
    },
  };
}
```

- [ ] **Step 3: Register the integration**

In `astro.config.mjs`, add the import near the other integration imports:

```js
import stripImageMetadata from './src/integrations/strip-image-metadata.mjs';
```

and add `stripImageMetadata(),` to the `integrations: [...]` array (after `pruneUnusedJs()`).

- [ ] **Step 4: Build and confirm the integration runs**

Run: `npm run build 2>&1 | grep -iE "strip-image-metadata|Complete"`
Expected: a `strip-image-metadata: stripped N image(s)` line and "Complete!". (After the B1 source scrub, N is typically 0 — the backstop has nothing to do, which is correct.)

- [ ] **Step 5: Assert the built site is metadata-clean**

Run: `node scripts/scan-exif.mjs dist | tail -3`
Expected: `with-metadata 0`, exit 0. (Specifically confirms `dist/_astro/IMG_1373*.png`-style originals no longer carry GPS.)

- [ ] **Step 6: Full regression + commit**

```bash
npm run check 2>&1 | tail -4        # 0 errors
npm run check:links 2>&1 | tail -5
git add -A
git commit -m "feat(build): strip image metadata from dist assets (EXIF/GPS backstop)"
```

---

## Self-Review

**Spec coverage:** scope/all-generic-names → A3+A4; per-post hierarchy + `featured.<ext>` → A2 (`build-rename-plan` dest logic) + A3/A4; Haiku naming → A3/A4; orphans/shared → A1 (review) + A5; videos restructured → A2/A4 (media root); EXIF source scrub → B1; build-time strip → B2; verification (build/check/links/EXIF/size) → A4 + B2; cleanup stale comments + empty dirs → A5; checkpoint-after-batch-1 → A3 Step 7. All spec sections map to a task.

**Placeholder scan:** `SLUG` in A3 is an explicit operator substitution (the chosen checkpoint post), not a code placeholder; all scripts are complete and runnable. No TBD/TODO.

**Type/shape consistency:** `asset-map.json` shape emitted by A1 (`posts{file,featureImage,images,videos{src,poster,posterRoot,posterMissing}}`, `assets[{root,rel,posts,kinds}]`, `orphans`, `shared`) is exactly what `build-rename-plan.mjs` reads in A2. `asset-names.json` key form `"<root>:<rel>"` is consistent between A3/A4 (writers) and `build-rename-plan.mjs` (reader). `rename-plan.json` `{moves,edits}` shape is consistent between builder (A2) and applier (A2). `scan-exif.mjs` reused by B1 (sources) and B2 (dist).

**Risks already mitigated in-plan:** broken refs (build throws — A4 Step 3); shared asset in checkpoint (pick a non-shared checkpoint post — A3 intro); name overlap with featureImage substring (figure/video edits are attribute-qualified `="rel"` — A2 builder); build-time re-encode cost (skip clean files — B2 integration).

---

## Addendum — A1 inventory findings (2026-06-19)

Running the inventory surfaced refinements the spec didn't anticipate:

- **SEO frontmatter image fields.** `asset-map.mjs` now also parses `ogImage` and
  `twitterImage` (kinds `og`/`twitter`), not just `featureImage`. Only `twitterImage` is
  used in practice (2 posts: `codye-6.png`→hello-world, `new-2.png`→new-personal-website).
  `build-rename-plan.mjs` (A2) names these `og.<ext>`/`twitter.<ext>` (conventional, like
  `featured`) when distinct from the feature image, and rewrites the frontmatter
  `ogImage:`/`twitterImage:` lines to `/content/images/posts/<slug>/<name>.<ext>`.

- **Site/brand images (4 files) — not post assets.** `2024/07/android-chrome-512x512-1.png`
  (logo + default twitter), `2024/07/android-chrome-512x512.png` (favicon/icon),
  `2020/07/android-chrome-512x512.png` (OG default), `2024/06/profile_small-1.png` (avatar)
  are referenced from `src/config.ts` (string paths) and `src/data/site-images.ts` (imports).
  They stay under `src/assets` (optimized + hashed + intrinsic dims the code uses) — NOT
  `public/` — but move to `src/assets/content/images/site/` with clean names: `logo.png`,
  `icon.png`, `og-default.png`, `avatar.png`. Update the import paths in `site-images.ts`
  and the string paths in `config.ts`. (Handled in Task A5.)

- **True orphans (2 files) → delete** (user-confirmed): `images/2020/07/android-chrome-512x512-1.png`
  (stray duplicate icon) and `media/2024/08/Broke_thumb.jpg` (unreferenced video thumbnail);
  `git rm` both in Task A5.

Final tally: 392 post assets + 4 site images + 2 orphans = 398 (all accounted for); 0 shared.
