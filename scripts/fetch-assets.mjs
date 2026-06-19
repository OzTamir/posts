#!/usr/bin/env node
/**
 * fetch-assets.mjs
 * Downloads all Ghost blog assets (images + media) to public/content/
 * preserving Ghost's exact path structure.
 *
 * Usage: node scripts/fetch-assets.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const SITE_BASE = 'https://posts.oztamir.com';
const IMAGE_ORIGINALS_TXT = '/private/tmp/claude-501/-Users-oztamir-Code-Personal-oz-blog/5a2118f5-3c78-46f2-9562-b1d53221e43e/scratchpad/image-originals.txt';
const GHOST_EXPORT_JSON = join(REPO_ROOT, 'ghost-assets/ghost-export.json');
const PUBLIC_DIR = join(REPO_ROOT, 'public');
const FAILURES_TXT = '/private/tmp/claude-501/-Users-oztamir-Code-Personal-oz-blog/5a2118f5-3c78-46f2-9562-b1d53221e43e/scratchpad/asset-failures.txt';

const CONCURRENCY = 8;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── 1. Build URL list ────────────────────────────────────────────────────────

const SIZE_RE = /\/size\/w\d+\//g;
const CONTENT_PATH_RE = /\/content\/(images|media)\/[^\s"'<>)\\]+/g;

function normalizePath(raw) {
  // Strip __GHOST_URL__ or absolute host
  let p = raw.trim()
    .replace(/^__GHOST_URL__/, '')
    .replace(/^https?:\/\/posts\.oztamir\.com/, '');
  // Strip responsive-size segments
  p = p.replace(SIZE_RE, '/');
  // Strip trailing punctuation
  p = p.replace(/[.,;"')]+$/, '');
  return p;
}

const pathSet = new Set();

// From image-originals.txt
const imageOriginals = readFileSync(IMAGE_ORIGINALS_TXT, 'utf8').split('\n');
for (const line of imageOriginals) {
  const p = normalizePath(line);
  if (p.startsWith('/content/')) pathSet.add(p);
}

// From ghost-export.json (full scan)
const exportRaw = readFileSync(GHOST_EXPORT_JSON, 'utf8');
for (const m of exportRaw.matchAll(CONTENT_PATH_RE)) {
  const p = normalizePath(m[0]);
  if (p.startsWith('/content/')) pathSet.add(p);
}

// Explicit must-haves
[
  '/content/images/2024/07/android-chrome-512x512.png',
  '/content/images/2024/07/android-chrome-512x512-1.png',
  '/content/images/2024/06/profile_small-1.png',
].forEach(p => pathSet.add(p));

const allPaths = [...pathSet].filter(p =>
  p.startsWith('/content/images/') || p.startsWith('/content/media/')
);

console.log(`\n=== Ghost Asset Downloader ===`);
console.log(`Total unique asset paths: ${allPaths.length}`);
console.log(`  Images: ${allPaths.filter(p => p.includes('/images/')).length}`);
console.log(`  Media:  ${allPaths.filter(p => p.includes('/media/')).length}`);
console.log();

// ── 2. Download helpers ──────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'image/*,video/*,*/*;q=0.8',
        'Accept-Encoding': 'identity', // no gzip so we get raw bytes
      },
      timeout: 30000,
    }, (res) => {
      // Follow redirects (up to 5)
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const location = res.headers.location;
        if (!location) return reject(new Error(`Redirect with no Location header from ${url}`));
        res.resume();
        return downloadFile(location, destPath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(Object.assign(new Error(`HTTP ${res.statusCode} for ${url}`), { statusCode: res.statusCode }));
      }

      mkdirSync(dirname(destPath), { recursive: true });

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        writeFileSync(destPath, buf);
        resolve(buf.length);
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

async function downloadWithRetry(url, destPath) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const bytes = await downloadFile(url, destPath);
      return { ok: true, bytes };
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        return { ok: false, error: err.message, statusCode: err.statusCode };
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

// ── 3. Concurrent download queue ────────────────────────────────────────────

let downloaded = 0;
let skippedExisting = 0;
let failed = 0;
const failedUrls = [];
let attempted = 0;

async function processPath(assetPath) {
  const url = SITE_BASE + assetPath;
  const destPath = join(PUBLIC_DIR, assetPath);

  attempted++;

  // Skip if already exists
  if (existsSync(destPath)) {
    skippedExisting++;
    process.stdout.write('.');
    return;
  }

  const result = await downloadWithRetry(url, destPath);
  if (result.ok) {
    downloaded++;
    process.stdout.write('+');
  } else {
    failed++;
    failedUrls.push({ url, error: result.error, statusCode: result.statusCode });
    process.stdout.write('!');
  }
}

// Run with concurrency limit
async function runWithConcurrency(items, fn, concurrency) {
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const item = items[idx++];
      await fn(item);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
}

// ── 4. Main ──────────────────────────────────────────────────────────────────

console.log(`Downloading to: ${PUBLIC_DIR}/content/`);
console.log(`Legend: + downloaded  . skipped-exists  ! failed\n`);

await runWithConcurrency(allPaths, processPath, CONCURRENCY);

console.log('\n');
console.log('=== Summary ===');
console.log(`Total paths:      ${allPaths.length}`);
console.log(`Attempted:        ${attempted}`);
console.log(`Downloaded:       ${downloaded}`);
console.log(`Skipped (exists): ${skippedExisting}`);
console.log(`Failed:           ${failed}`);

if (failedUrls.length > 0) {
  console.log('\nFailed URLs:');
  for (const { url, error, statusCode } of failedUrls) {
    const tag = statusCode ? `[HTTP ${statusCode}]` : '[ERR]';
    console.log(`  ${tag} ${url}  (${error})`);
  }

  const failLines = failedUrls.map(({ url, error, statusCode }) => {
    const tag = statusCode ? `HTTP_${statusCode}` : 'ERROR';
    return `${tag}\t${url}\t${error}`;
  });
  writeFileSync(FAILURES_TXT, failLines.join('\n') + '\n');
  console.log(`\nFailed URLs written to: ${FAILURES_TXT}`);
} else {
  console.log('\nAll assets downloaded successfully!');
  writeFileSync(FAILURES_TXT, '');
}
