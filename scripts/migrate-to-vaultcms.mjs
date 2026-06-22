#!/usr/bin/env node
/**
 * migrate-to-vaultcms.mjs
 *
 * One-time codemod: migrate legacy flat .mdx posts → folder-based .md format.
 *
 * Usage:
 *   node scripts/migrate-to-vaultcms.mjs [--dry] [slug]
 *
 *   --dry   Print proposed index.md + planned asset moves; no writes or git ops.
 *   slug    Migrate only this one post slug.
 *           With neither flag, migrates all remaining un-migrated .mdx posts.
 *
 * Convention (proven by pilot post):
 *   - Post goes to:   src/content/posts/<slug>/index.md
 *   - Images go to:   src/content/posts/<slug>/<basename>   (git mv from src/assets/content/images/posts/<slug>/)
 *   - Videos go to:   public/<slug>/<basename>               (git mv from src/assets/content/media/posts/<slug>/)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load js-yaml (transitive dep)
const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const slugArg = args.filter(a => !a.startsWith('--'))[0];

// ─── Paths ────────────────────────────────────────────────────────────────────
const POSTS_DIR       = join(ROOT, 'src/content/posts');
const IMAGES_ASSETS   = join(ROOT, 'src/assets/content/images/posts');
const MEDIA_ASSETS    = join(ROOT, 'src/assets/content/media/posts');
const PUBLIC_DIR      = join(ROOT, 'public');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise tags: [{slug, name}] or string[] → string[] */
function normaliseTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map(t => (typeof t === 'object' && t !== null ? t.name : t));
}

/** Extract basename from any path (/foo/bar/baz.png → baz.png) */
function bname(p) {
  return basename(String(p));
}

/**
 * Parse a JSX Figure/Video element.  Returns attrs as a plain object.
 *
 * Handles:
 *   caption="plain text"
 *   caption={"<span style=\"...\">text</span><a href=\"url\">label</a>"}
 *   wide  (bare boolean)
 *   autoplay (bare boolean)
 */
function parseJSXAttrs(raw) {
  const attrs = {};

  // Bare boolean attrs (wide, autoplay)
  for (const boolAttr of ['wide', 'autoplay']) {
    const re = new RegExp(`\\b${boolAttr}(?=[\\s/>])`, 'g');
    if (re.test(raw)) {
      attrs[boolAttr] = true;
    }
  }

  // String attrs: key="value" or key={"value"}
  // We scan for: attrName= then either "..." or {"..."}
  const attrRe = /(\w+)=(?:"((?:[^"\\]|\\.)*)"|{("(?:[^"\\]|\\.)*")})/g;
  let m;
  while ((m = attrRe.exec(raw)) !== null) {
    const key = m[1];
    let val;
    if (m[2] !== undefined) {
      // key="value" — standard
      val = m[2];
    } else if (m[3] !== undefined) {
      // key={"value"} — JSX expression containing a JSON string
      try {
        val = JSON.parse(m[3]);
      } catch {
        // fallback: strip outer quotes
        val = m[3].replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
    }
    if (val !== undefined) attrs[key] = val;
  }
  return attrs;
}

/**
 * Convert an HTML caption string (possibly containing <a> tags and <span>s)
 * to a Markdown-safe plain+link string.
 *
 * Handles:
 *   - <a href="url">label</a>        → [label](url)  or  url  if label===url
 *   - <span style="...">text</span>  → text  (strips wrapper)
 *   - <code>...</code>               → `...`
 *   - bare text                      → passed through
 *
 * Returns the markdown-safe caption string ready to wrap in *...*
 */
function htmlCaptionToMarkdown(html) {
  let s = html;
  // Strip <span ...>...</span> wrappers (keep inner)
  s = s.replace(/<span[^>]*>([\s\S]*?)<\/span>/g, '$1');
  // Convert <code>...</code> to backtick
  s = s.replace(/<code>([\s\S]*?)<\/code>/g, '`$1`');
  // Convert <a href="url">label</a>
  s = s.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, url, label) => {
    const cleanLabel = label.replace(/<[^>]+>/g, '').trim();
    return cleanLabel === url ? url : `[${cleanLabel}](${url})`;
  });
  // Strip any remaining tags
  s = s.replace(/<[^>]+>/g, '');
  // Decode common HTML entities
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return s.trim();
}

/**
 * Transform the MDX body text into Markdown.
 *
 * Conversions:
 *   - Strip import lines for mdx components
 *   - <Figure .../>  → ![alt](basename){wide?}\n*caption*?
 *   - <Video .../>   → ![[basename|poster=...|title=...]]
 *   - <Tweet>...</Tweet>   → raw inner HTML wrapped in figure.embed-card blockquote
 *   - <Instagram permalink="...">...</Instagram> → raw inner HTML wrapped in figure.embed-card blockquote
 */
function transformBody(body, slug, videoFiles) {
  let out = body;

  // 1. Strip import lines
  out = out.replace(/^import\s+\w+\s+from\s+['"][^'"]*mdx\/[^'"]*['"]\s*;?\n/gm, '');

  // 2. Figure elements (self-closing, may be multi-line due to long attributes — but in practice all are single-line)
  // Match <Figure .../>  (self-closing)
  out = out.replace(/<Figure\s+([\s\S]*?)\/>/g, (match, attrsRaw) => {
    const attrs = parseJSXAttrs(attrsRaw);
    const src = attrs.src || '';
    const alt = attrs.alt || '';
    const caption = attrs.caption;
    const wide = attrs.wide;
    const format = attrs.format; // some Figure have format= (Twitter CDN url)
    const name = attrs.name;   // some have name= (Twitter CDN url)

    // Reconstruct src if it had query params (Twitter CDN format)
    // e.g. src="https://pbs.twimg.com/...?format=jpg&name=large"
    // These are remote URLs — keep them as-is (basename isn't meaningful)
    const isRemote = /^https?:\/\//.test(src);

    // Build image ref
    let imgRef;
    if (isRemote) {
      imgRef = `![${alt}](${src})`;
    } else {
      const imgBasename = bname(src);
      imgRef = `![${alt}](${imgBasename})`;
    }
    if (wide) imgRef += '{wide}';

    if (!caption) {
      return imgRef;
    }

    // Caption: convert HTML to markdown
    const captionMd = htmlCaptionToMarkdown(caption);
    // No blank line between image and emphasis (required by image-captions plugin)
    return `${imgRef}\n*${captionMd}*`;
  });

  // 3. Video elements
  out = out.replace(/<Video\s+([\s\S]*?)\/>/g, (match, attrsRaw) => {
    const attrs = parseJSXAttrs(attrsRaw);
    const src = attrs.src || '';
    const poster = attrs.poster;
    const title = attrs.title;
    // autoplay is dropped (handled by remark-video-embeds plugin)

    const videoBasename = bname(src);
    // Track this video file for the caller (asset move planning)
    videoFiles.push({ src, poster });

    let embed = `![[${videoBasename}`;
    const parts = [];
    if (poster) parts.push(`poster=${bname(poster)}`);
    if (title) parts.push(`title=${title}`);
    if (parts.length) embed += `|${parts.join('|')}`;
    embed += ']]';
    return embed;
  });

  // 4. Tweet embeds: <Tweet [width="..."]>...inner...</Tweet>
  //    → <figure class="embed-card flex w-full flex-col items-center"><blockquote class="twitter-tweet" [data-width="..."]>inner</blockquote></figure>
  out = out.replace(/<Tweet([^>]*)>([\s\S]*?)<\/Tweet>/g, (match, tweetAttrs, inner) => {
    const widthM = tweetAttrs.match(/width="([^"]*)"/);
    const dataWidth = widthM ? ` data-width="${widthM[1]}"` : '';
    return `<figure class="embed-card flex w-full flex-col items-center">
  <blockquote class="twitter-tweet"${dataWidth}>
    ${inner.trim()}
  </blockquote>
</figure>`;
  });

  // 5. Instagram embeds: <Instagram permalink="..." [captioned=...] [version="..."]>...inner...</Instagram>
  //    → raw blockquote HTML matching Instagram.astro output
  out = out.replace(/<Instagram\s+([\s\S]*?)>([\s\S]*?)<\/Instagram>/g, (match, igAttrs, inner) => {
    const permalinkM = igAttrs.match(/permalink="([^"]*)"/);
    const captionedM = igAttrs.match(/captioned=\{?(true|false)\}?/);
    const versionM = igAttrs.match(/version="([^"]*)"/);
    const permalink = permalinkM ? permalinkM[1] : '';
    const captioned = captionedM ? captionedM[1] !== 'false' : true;
    const version = versionM ? versionM[1] : '14';
    const embedStyle = 'background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin:1px; max-width:540px; min-width:326px; padding:0; width:calc(100% - 2px);';
    const captionedAttr = captioned ? ' data-instgrm-captioned=""' : '';
    return `<figure class="embed-card flex w-full flex-col items-center">
  <blockquote
    class="instagram-media"${captionedAttr}
    data-instgrm-permalink="${permalink}"
    data-instgrm-version="${version}"
    style="${embedStyle}">
    ${inner.trim()}
  </blockquote>
</figure>`;
  });

  // 6. Clean up any leftover blank lines at start
  out = out.replace(/^\n+/, '');

  return out;
}

/**
 * Build the new frontmatter object from the legacy one.
 */
function buildFrontmatter(legacy) {
  const fm = {};

  // Required renames
  fm.title = legacy.title;
  fm.date = legacy.pubDate ?? legacy.date;
  if (legacy.updatedDate) fm.updatedDate = legacy.updatedDate;
  if (legacy.author) fm.author = legacy.author;

  // description (was excerpt)
  const desc = legacy.excerpt ?? legacy.description;
  if (desc) fm.description = desc;

  // image: basename only
  const fi = legacy.featureImage ?? legacy.image;
  if (fi) {
    fm.image = fi === null ? null : bname(String(fi));
  }
  const fiAlt = legacy.featureImageAlt ?? legacy.imageAlt;
  if (fiAlt) fm.imageAlt = fiAlt;
  const fiCap = legacy.featureImageCaption ?? legacy.imageCaption;
  if (fiCap) fm.imageCaption = fiCap;

  // tags
  if (legacy.tags) fm.tags = normaliseTags(legacy.tags);

  // featured
  if (legacy.featured !== undefined) fm.featured = legacy.featured;

  // SEO fields
  for (const k of ['metaDescription', 'ogDescription', 'twitterDescription', 'twitterImage', 'ogImage', 'canonicalURL']) {
    if (legacy[k] !== undefined) fm[k] = legacy[k];
  }

  // draft: false if absent
  if (legacy.draft === undefined) fm.draft = false;
  else fm.draft = legacy.draft;

  return fm;
}

/**
 * Migrate one post slug.
 */
function migratePost(slug) {
  const mdxPath = join(POSTS_DIR, `${slug}.mdx`);
  const destDir = join(POSTS_DIR, slug);
  const destFile = join(destDir, 'index.md');

  // Idempotency: skip if already a folder
  if (existsSync(destDir)) {
    console.log(`[SKIP] ${slug} — already migrated (folder exists)`);
    return;
  }

  if (!existsSync(mdxPath)) {
    console.error(`[ERROR] ${mdxPath} not found`);
    return;
  }

  const raw = readFileSync(mdxPath, 'utf-8');

  // Split frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    console.error(`[ERROR] Could not parse frontmatter in ${slug}`);
    return;
  }
  const legacyFm = yaml.load(fmMatch[1]);
  const rawBody = fmMatch[2];

  // Build new frontmatter
  const newFm = buildFrontmatter(legacyFm);

  // Collect video asset info during body transform
  const videoFiles = [];
  const newBody = transformBody(rawBody, slug, videoFiles);

  // Produce new index.md content
  const newContent = `---\n${yaml.dump(newFm, { lineWidth: -1 })}---\n${newBody}`;

  // ─── Asset planning ──────────────────────────────────────────────────────
  const imgSrcDir = join(IMAGES_ASSETS, slug);
  const imgDestDir = destDir;

  // Find images
  let imagesToMove = [];
  if (existsSync(imgSrcDir)) {
    imagesToMove = readdirSync(imgSrcDir).map(f => ({
      from: join(imgSrcDir, f),
      to:   join(imgDestDir, f),
    }));
  }

  // Videos: from src/assets/content/media/posts/<slug>/ → public/<slug>/
  const mediaSrcDir = join(MEDIA_ASSETS, slug);
  const mediaDestDir = join(PUBLIC_DIR, slug);
  let videosToMove = [];
  if (existsSync(mediaSrcDir)) {
    videosToMove = readdirSync(mediaSrcDir).map(f => ({
      from: join(mediaSrcDir, f),
      to:   join(mediaDestDir, f),
    }));
  }

  // ─── Dry-run output ──────────────────────────────────────────────────────
  if (DRY) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`DRY RUN: ${slug}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`\n--- PROPOSED index.md ---\n`);
    console.log(newContent);
    console.log(`\n--- PLANNED ASSET MOVES ---`);
    if (imagesToMove.length === 0) {
      console.log('  (no images found in src/assets/content/images/posts/' + slug + '/)');
    }
    for (const { from, to } of imagesToMove) {
      console.log(`  git mv ${from.replace(ROOT + '/', '')} ${to.replace(ROOT + '/', '')}`);
    }
    if (videosToMove.length === 0 && videoFiles.length > 0) {
      console.log('  WARNING: Video refs found in body but no files in media/posts/' + slug + '/');
    }
    for (const { from, to } of videosToMove) {
      console.log(`  git mv ${from.replace(ROOT + '/', '')} ${to.replace(ROOT + '/', '')}`);
    }
    console.log(`  git rm src/content/posts/${slug}.mdx`);
    console.log('');
    return;
  }

  // ─── Real migration ──────────────────────────────────────────────────────
  console.log(`[MIGRATE] ${slug}`);

  // Create post folder
  mkdirSync(destDir, { recursive: true });

  // Move images
  for (const { from, to } of imagesToMove) {
    execSync(`git mv "${from}" "${to}"`, { cwd: ROOT });
    console.log(`  mv img: ${bname(from)}`);
  }

  // Move videos to public/<slug>/
  if (videosToMove.length > 0) {
    mkdirSync(mediaDestDir, { recursive: true });
    for (const { from, to } of videosToMove) {
      execSync(`git mv "${from}" "${to}"`, { cwd: ROOT });
      console.log(`  mv vid: ${bname(from)} → public/${slug}/`);
    }
  }

  // Write index.md
  writeFileSync(destFile, newContent, 'utf-8');
  execSync(`git add "${destFile}"`, { cwd: ROOT });
  console.log(`  wrote: src/content/posts/${slug}/index.md`);

  // Remove old .mdx
  execSync(`git rm "${mdxPath}"`, { cwd: ROOT });
  console.log(`  rm: src/content/posts/${slug}.mdx`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
if (slugArg) {
  migratePost(slugArg);
} else {
  // All remaining .mdx posts
  const mdxFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  for (const f of mdxFiles) {
    const slug = f.replace(/\.mdx$/, '');
    migratePost(slug);
  }
}
