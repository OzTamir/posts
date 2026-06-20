#!/usr/bin/env node
/**
 * scan-exif.mjs <dir> — exit 1 if any raster image carries EXIF/XMP/IPTC.
 * Used to verify both source scrub and the built dist output.
 *   node scripts/scan-exif.mjs src/assets/content/images
 *   node scripts/scan-exif.mjs dist
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const dir = process.argv[2];
if (!dir) { console.error('usage: scan-exif.mjs <dir>'); process.exit(2); }
const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp']);

async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = (await walk(dir)).filter((f) => RASTER.has(extname(f).toLowerCase()));
let bad = 0;
for (const f of files) {
  const m = await sharp(await readFile(f)).metadata();
  if (m.exif || m.xmp || m.iptc) { bad++; console.log(`META: ${f}`); }
}
console.log(`scanned ${files.length} rasters, ${bad} with EXIF/XMP/IPTC`);
process.exit(bad ? 1 : 0);
