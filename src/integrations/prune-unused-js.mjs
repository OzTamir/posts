/**
 * prune-unused-js — remove orphaned /_astro/*.js chunks after the build.
 *
 * The site ships ZERO client JS (no `client:*` hydration anywhere), but the
 * React renderer still emits its ~190KB client runtime as a registered entry
 * chunk. Nothing references it, so it never loads — but it's dead weight in
 * the deploy. This integration scans every built HTML page for /_astro/*.js
 * references and deletes any JS chunk that isn't referenced by ANY page.
 *
 * It is conservative: a chunk is removed only when it appears in zero pages,
 * so it can never strip JS that is actually used. If the site ever adds a
 * `client:*` island, that chunk will be referenced and left untouched.
 */
import { readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export default function pruneUnusedJs() {
  return {
    name: 'prune-unused-js',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const files = walk(root);
        const htmlFiles = files.filter((f) => f.endsWith('.html'));
        const jsFiles = files.filter((f) => /[/\\]_astro[/\\][^/\\]+\.js$/.test(f));
        if (jsFiles.length === 0) return;

        // Collect every /_astro/*.js basename referenced by any HTML page.
        const referenced = new Set();
        for (const html of htmlFiles) {
          const src = readFileSync(html, 'utf8');
          for (const m of src.matchAll(/\/_astro\/([^"'()\s]+\.js)/g)) referenced.add(m[1]);
        }

        let removed = 0;
        let freed = 0;
        for (const js of jsFiles) {
          const base = js.split(/[/\\]/).pop();
          if (!referenced.has(base)) {
            freed += statSync(js).size;
            rmSync(js);
            removed++;
          }
        }
        if (removed > 0) {
          logger.info(
            `pruned ${removed} unreferenced /_astro JS chunk(s) (${(freed / 1024).toFixed(0)} KB) — site ships no client JS`,
          );
        }
      },
    },
  };
}
