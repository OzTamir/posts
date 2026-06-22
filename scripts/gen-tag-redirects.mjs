#!/usr/bin/env node
/**
 * gen-tag-redirects.mjs
 *
 * Reads the legacy {slug, name} tag data from git revision 002941f (pre-VaultCMS-migration),
 * computes the new slug via slugify(name), and emits Cloudflare _redirects lines for
 * any tag whose slug changed.
 *
 * Usage:
 *   node scripts/gen-tag-redirects.mjs
 *
 * Output to stdout — append to public/_redirects:
 *   node scripts/gen-tag-redirects.mjs >> public/_redirects
 */

import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

// Mirror of src/utils/slug.ts — must be kept in sync.
function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const LEGACY_REV = '002941f';

// Get the list of .mdx post files at the legacy revision
const fileList = execSync(
  `git ls-tree -r --name-only ${LEGACY_REV} -- src/content/posts`,
  { encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter((f) => f.endsWith('.mdx'));

if (fileList.length === 0) {
  console.error('ERROR: No .mdx files found at revision', LEGACY_REV);
  process.exit(1);
}

// Map: oldSlug → newSlug (only where they differ)
const redirectMap = new Map();

for (const filePath of fileList) {
  const content = execSync(`git show ${LEGACY_REV}:${filePath}`, {
    encoding: 'utf8',
  });

  // Extract frontmatter (between first pair of ---)
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) continue;

  let fm;
  try {
    fm = yaml.load(match[1]);
  } catch (e) {
    console.error(`WARN: failed to parse frontmatter in ${filePath}:`, e.message);
    continue;
  }

  if (!Array.isArray(fm?.tags)) continue;

  for (const tag of fm.tags) {
    // Legacy format: {slug: string, name: string}
    if (!tag || typeof tag !== 'object') continue;
    const { slug: oldSlug, name } = tag;
    if (!oldSlug || !name) continue;

    const newSlug = slugify(name);
    if (oldSlug !== newSlug) {
      // De-duplicate: if same oldSlug already seen, newSlug should be the same
      if (redirectMap.has(oldSlug) && redirectMap.get(oldSlug) !== newSlug) {
        console.error(
          `WARN: oldSlug "${oldSlug}" maps to two different newSlugs: "${redirectMap.get(oldSlug)}" and "${newSlug}". Keeping first.`
        );
      } else {
        redirectMap.set(oldSlug, newSlug);
      }
    }
  }
}

if (redirectMap.size === 0) {
  console.error('ERROR: No redirect pairs found — something is wrong. Aborting.');
  process.exit(1);
}

// Sort for stable output
const sorted = [...redirectMap.entries()].sort(([a], [b]) => a.localeCompare(b));

console.log('');
console.log('# Tag slug redirects (VaultCMS migration)');
for (const [oldSlug, newSlug] of sorted) {
  console.log(`/tag/${oldSlug}/ /tag/${newSlug}/ 301`);
}
