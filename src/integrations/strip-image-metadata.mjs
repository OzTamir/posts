/**
 * strip-image-metadata — Astro integration.
 *
 * After the build, strip EXIF/XMP/IPTC from emitted raster images so no
 * location/camera metadata ships, even if a future source image is added
 * without being scrubbed first. Sharp's optimized WebP variants are already
 * metadata-free, and committed sources are scrubbed (exiftool), so in practice
 * this pass re-encodes ~0 files — it only acts on anything that slipped through.
 *
 * Files already clean are skipped (fast). GIFs are not touched (the format
 * carries no EXIF/GPS). ICC-only profiles are left alone (not sensitive).
 *
 * Relies on `sharp`, which Astro's image pipeline already installs.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp']);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
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
          if (!meta.exif && !meta.xmp && !meta.iptc) continue; // already clean
          const ext = extname(file).toLowerCase();
          const pipe = sharp(buf); // sharp drops metadata unless withMetadata() is called
          const out = await (ext === '.png' ? pipe.png() : ext === '.webp' ? pipe.webp() : pipe.jpeg()).toBuffer();
          await writeFile(file, out);
          stripped++;
        }
        logger.info(`stripped metadata from ${stripped} image(s)`);
      },
    },
  };
}
