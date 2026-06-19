/**
 * check-links.mjs — offline broken-internal-link checker for the built site.
 *
 * Scans every dist/**\/*.html, collects internal links/refs (root-relative
 * `/...` from href, src, srcset), and verifies each resolves to a real file
 * in dist. It is intentionally dependency-free and deterministic so CI never
 * needs a network or a running server.
 *
 * Resolution rules (matching how Workers Static Assets serves the build):
 *   • `/foo/`            -> dist/foo/index.html
 *   • `/foo`             -> dist/foo OR dist/foo/index.html (trailing-slash auto)
 *   • `/foo.ext`         -> dist/foo.ext
 *   • the `_redirects`   -> sources are treated as valid (they 301 elsewhere)
 *   • `#hash` / mailto:/ tel:/ data: / external http(s) are skipped
 *
 * Exit code 1 (with a report) if any internal link is dangling.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));

if (!existsSync(DIST)) {
  console.error(`✗ dist/ not found at ${DIST} — run \`npm run build\` first.`);
  process.exit(1);
}

/** Recursively list all files under a dir (absolute paths). */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Parse `_redirects` source paths (these are valid targets — they 301). */
function redirectSources() {
  const file = join(DIST, '_redirects');
  if (!existsSync(file)) return new Set();
  const set = new Set();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const src = trimmed.split(/\s+/)[0];
    if (src?.startsWith('/')) set.add(src);
  }
  return set;
}

const allFiles = walk(DIST);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
// Set of dist-relative URL paths that exist as files (with a leading slash).
const filePaths = new Set(allFiles.map((f) => '/' + f.slice(DIST.length + 1).split('\\').join('/')));
const redirects = redirectSources();

/** Does an internal URL path resolve to a real built file (or a redirect)? */
function resolves(urlPath) {
  // Strip query/hash.
  const clean = urlPath.split('#')[0].split('?')[0];
  if (clean === '' || clean === '/') return filePaths.has('/index.html');
  if (redirects.has(clean)) return true;
  if (filePaths.has(clean)) return true; // exact file (e.g. /rss.xml, /robots.txt)
  // Directory-style URL: /foo/ -> /foo/index.html
  if (clean.endsWith('/')) return filePaths.has(clean + 'index.html');
  // Extension-less without trailing slash: allow /foo -> /foo/index.html
  if (!clean.split('/').pop().includes('.')) return filePaths.has(clean + '/index.html');
  return false;
}

/** Extract internal refs from one HTML file. */
function refsIn(html) {
  const refs = new Set();
  // href="..." and src="..."
  for (const m of html.matchAll(/(?:href|src)\s*=\s*"([^"]*)"/g)) refs.add(m[1]);
  // srcset="url 1x, url 2x" — take each URL token
  for (const m of html.matchAll(/srcset\s*=\s*"([^"]*)"/g)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url) refs.add(url);
    }
  }
  return refs;
}

function isInternal(ref) {
  if (!ref) return false;
  if (ref.startsWith('//')) return false; // protocol-relative -> external
  if (/^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref)) return false;
  return ref.startsWith('/'); // only root-relative internal links
}

let broken = 0;
let checked = 0;
for (const file of htmlFiles) {
  const rel = file.slice(DIST.length + 1);
  const html = readFileSync(file, 'utf8');
  for (const ref of refsIn(html)) {
    if (!isInternal(ref)) continue;
    checked++;
    if (!resolves(ref)) {
      broken++;
      console.error(`✗ ${rel}  ->  ${ref}`);
    }
  }
}

if (broken > 0) {
  console.error(`\n✗ ${broken} broken internal link(s) across ${htmlFiles.length} pages.`);
  process.exit(1);
}
console.log(`✓ No broken internal links (${checked} internal refs across ${htmlFiles.length} pages).`);
