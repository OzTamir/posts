/**
 * Ghost → Astro content migration script
 * Converts 41 Ghost posts to src/content/posts/<slug>.md
 *
 * Usage: node scripts/convert-content.mjs
 */

import { createRequire } from 'module';
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');
const yaml = require('js-yaml');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Load Ghost export ────────────────────────────────────────────────────────
const raw = readFileSync(join(ROOT, 'ghost-assets/ghost-export.json'), 'utf8');
const db = JSON.parse(raw).db[0].data;

const { posts, tags, posts_tags, posts_meta } = db;

// ─── URL rewriting ────────────────────────────────────────────────────────────
/**
 * Rewrites Ghost-internal URLs:
 * 1. __GHOST_URL__ → ''
 * 2. https://posts.oztamir.com and http://posts.oztamir.com → ''
 * 3. /content/images/size/wNNN/ or /size/wNNNhNNN/ → /content/images/
 */
function rewriteUrl(url) {
  if (!url) return url;
  let u = url;
  u = u.replace(/__GHOST_URL__/g, '');
  u = u.replace(/https?:\/\/posts\.oztamir\.com/g, '');
  // Strip responsive size segments: /content/images/size/wNNN/ or /size/wNNNhNNN/
  u = u.replace(/\/content\/images\/size\/w\d+h?\d*\//g, '/content/images/');
  return u;
}

/**
 * Rewrite all Ghost URLs in an HTML string (for srcset, src, href that
 * contain Ghost-internal paths).
 */
function rewriteHtml(html) {
  if (!html) return html;
  let h = html;
  h = h.replace(/__GHOST_URL__/g, '');
  h = h.replace(/https?:\/\/posts\.oztamir\.com/g, '');
  // Strip responsive size segments inside URLs
  h = h.replace(/\/content\/images\/size\/w\d+h?\d*\//g, '/content/images/');
  return h;
}

// ─── Build lookup maps ────────────────────────────────────────────────────────
const tagById = new Map(tags.map(t => [t.id, t]));

const postsMeta = new Map(); // post_id → posts_meta row
for (const m of posts_meta) {
  postsMeta.set(m.post_id, m);
}

// posts_tags per post, sorted by sort_order
const postTagsMap = new Map(); // post_id → sorted [{slug, name}]
for (const pt of posts_tags) {
  if (!postTagsMap.has(pt.post_id)) postTagsMap.set(pt.post_id, []);
  postTagsMap.get(pt.post_id).push(pt);
}
for (const [postId, pts] of postTagsMap) {
  pts.sort((a, b) => a.sort_order - b.sort_order);
  postTagsMap.set(
    postId,
    pts
      .map(pt => tagById.get(pt.tag_id))
      .filter(t => t && !t.name.startsWith('#'))  // exclude internal tags
      .map(t => ({ slug: t.slug, name: t.name }))
  );
}

// ─── Turndown setup ───────────────────────────────────────────────────────────
const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
td.use(gfm);

// Helper: decode basic HTML entities in text content
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&apos;/g, "'");
}

// RULE 1: Code blocks
td.addRule('code-fenced', {
  filter(node) {
    return (
      node.nodeName === 'PRE' &&
      node.firstChild &&
      node.firstChild.nodeName === 'CODE'
    );
  },
  replacement(content, node) {
    const codeNode = node.firstChild;
    const classList = codeNode.getAttribute ? codeNode.getAttribute('class') || '' : '';
    const langMatch = classList.match(/language-(\S+)/);
    const lang = langMatch ? langMatch[1] : '';
    const text = decodeEntities(codeNode.textContent || '');
    // Ensure text ends with a newline before the fence
    const body = text.endsWith('\n') ? text : text + '\n';
    return `\n\`\`\`${lang}\n${body}\`\`\`\n`;
  },
});

// RULE 2: Image cards (figure.kg-image-card or any figure with img)
td.addRule('kg-image-card', {
  filter(node) {
    if (node.nodeName !== 'FIGURE') return false;
    // Must contain an img
    return !!node.querySelector('img');
  },
  replacement(content, node) {
    const img = node.querySelector('img');
    if (!img) return content;

    // Build class list for the figure
    const figClasses = node.getAttribute('class') || '';
    // Keep kg-card, kg-image-card, kg-width-wide, kg-card-hascaption (drop others)
    const keptClasses = figClasses
      .split(/\s+/)
      .filter(c =>
        ['kg-card', 'kg-image-card', 'kg-width-wide', 'kg-card-hascaption', 'kg-width-full'].includes(c)
      )
      .join(' ');
    const figClass = keptClasses || 'kg-card kg-image-card';

    const src = rewriteUrl(img.getAttribute('src') || '');
    const alt = img.getAttribute('alt') || '';
    const width = img.getAttribute('width') || '';
    const height = img.getAttribute('height') || '';
    // loading/decoding defaults
    const loadingAttr = ' loading="lazy" decoding="async"';

    let imgTag = `<img src="${src}" alt="${alt}"`;
    if (width) imgTag += ` width="${width}"`;
    if (height) imgTag += ` height="${height}"`;
    imgTag += `${loadingAttr}>`;

    // figcaption
    const figcaption = node.querySelector('figcaption');
    let captionHtml = '';
    if (figcaption) {
      captionHtml = `\n  <figcaption>${figcaption.innerHTML}</figcaption>`;
    }

    return `\n\n<figure class="${figClass}">\n  ${imgTag}${captionHtml}\n</figure>\n\n`;
  },
});

// RULE 3: Video cards
td.addRule('kg-video-card', {
  filter(node) {
    if (node.nodeName !== 'FIGURE') return false;
    const cls = node.getAttribute('class') || '';
    return cls.includes('kg-video-card');
  },
  replacement(content, node) {
    // Find the video element
    const video = node.querySelector('video');
    if (!video) return content;

    const src = rewriteUrl(video.getAttribute('src') || '');
    // Poster: Ghost uses a spacer.png placeholder; look for the real thumbnail in style
    // The real thumbnail is in the style attribute: background: ... url('...')
    let poster = video.getAttribute('poster') || '';
    const styleAttr = video.getAttribute('style') || '';
    const thumbMatch = styleAttr.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    if (thumbMatch) {
      poster = rewriteUrl(thumbMatch[1]);
    } else {
      poster = rewriteUrl(poster);
    }

    let videoTag = `<video src="${src}"`;
    if (poster) videoTag += ` poster="${poster}"`;
    videoTag += ` controls preload="metadata" playsinline style="width:100%"></video>`;

    return `\n\n<figure class="kg-card kg-video-card">\n  ${videoTag}\n</figure>\n\n`;
  },
});

// RULE 4: Embed cards — keep inner HTML, strip <script> tags inside
td.addRule('kg-embed-card', {
  filter(node) {
    if (node.nodeName !== 'FIGURE') return false;
    const cls = node.getAttribute('class') || '';
    return cls.includes('kg-embed-card');
  },
  replacement(content, node) {
    // Get the inner HTML, strip script tags
    let inner = node.innerHTML || '';
    inner = inner.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    inner = inner.trim();
    return `\n\n<figure class="kg-card kg-embed-card">\n${inner}\n</figure>\n\n`;
  },
});

// RULE 5: Strip kg-card-content wrappers (keep content)
td.addRule('kg-card-content', {
  filter(node) {
    const cls = node.getAttribute ? node.getAttribute('class') || '' : '';
    return cls.includes('kg-card-content');
  },
  replacement(content) {
    return content;
  },
});

// ─── Script collection for reporting ─────────────────────────────────────────
const scriptReports = [];

// ─── Pre-processing HTML before turndown ─────────────────────────────────────
/**
 * Pre-process raw Ghost HTML:
 * 1. Strip srcset/sizes attributes (we only host originals)
 * 2. Rewrite all URLs (Ghost placeholders → real paths)
 * 3. Handle <script> tags:
 *    - Inside kg-embed-card: stripped by the embed rule
 *    - Instagram embed.js / twitter widgets.js inside kg-card-begin:html: drop script
 *    - Any gist.github.com script: convert to <a> link
 *    - Other loose scripts: handled here
 * 4. Strip Ghost HTML card comments (<!--kg-card-begin: html-->)
 * Returns processed HTML string + list of script reports for this post
 */
function preprocessHtml(html, slug) {
  if (!html) return { html: '', scripts: [] };

  const localScripts = [];

  // Strip Ghost kg-card-begin/end HTML comments (just the comments themselves, keep content)
  let h = html.replace(/<!--kg-card-begin: html-->/g, '').replace(/<!--kg-card-end: html-->/g, '');

  // Rewrite URLs everywhere
  h = rewriteHtml(h);

  // Handle gist script tags: convert to anchor links
  h = h.replace(
    /<script[^>]+src="([^"]*gist\.github\.com[^"]*\.js)"[^>]*><\/script>/gi,
    (match, src) => {
      const gistUrl = src.replace(/\.js$/, '');
      localScripts.push({ type: 'gist', src, action: `converted to <a href="${gistUrl}">` });
      return `<a href="${gistUrl}">View the gist on GitHub</a>`;
    }
  );

  // For embed scripts (twitter widgets.js, instagram embed.js) that are INSIDE figure.kg-embed-card,
  // they'll be stripped by the turndown rule. But if they appear outside, handle them here.
  // Strip twitter/instagram widget scripts outside of embed cards
  h = h.replace(
    /<script[^>]+src="[^"]*(?:platform\.twitter\.com\/widgets\.js|instagram\.com\/embed\.js)[^"]*"[^>]*><\/script>/gi,
    (match) => {
      localScripts.push({ type: 'widget-script', src: match, action: 'stripped (widget loader; embed HTML is preserved)' });
      return '';
    }
  );

  // Any remaining <script> with a src: convert to link or strip and report
  h = h.replace(
    /<script[^>]+src="([^"]+)"[^>]*>[\s\S]*?<\/script>/gi,
    (match, src) => {
      localScripts.push({ type: 'unknown-script', src, action: 'stripped and reported' });
      return `<!-- script stripped: ${src} -->`;
    }
  );

  // Inline scripts: strip silently (Ghost often includes inline JS for UI; not content)
  h = h.replace(/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi, '');

  if (localScripts.length > 0) {
    scriptReports.push({ slug, scripts: localScripts });
  }

  return { html: h, scripts: localScripts };
}

// ─── Build frontmatter object ─────────────────────────────────────────────────
function buildFrontmatter(post) {
  const meta = postsMeta.get(post.id) || {};
  const tagsList = postTagsMap.get(post.id) || [];

  const fm = {
    title: post.title,
    pubDate: post.published_at,
    updatedDate: post.updated_at || undefined,
    tags: tagsList,
    author: 'oz',
    featured: Boolean(post.featured),
  };

  // excerpt
  if (post.custom_excerpt) fm.excerpt = post.custom_excerpt;

  // featureImage
  const featureImage = rewriteUrl(post.feature_image);
  if (featureImage) fm.featureImage = featureImage;
  else fm.featureImage = null;

  // featureImageAlt / featureImageCaption from posts_meta
  if (meta.feature_image_alt) fm.featureImageAlt = meta.feature_image_alt;
  if (meta.feature_image_caption) fm.featureImageCaption = meta.feature_image_caption;

  // SEO fields from posts_meta
  if (meta.meta_title) fm.metaTitle = meta.meta_title;
  if (meta.meta_description) fm.metaDescription = meta.meta_description;
  if (meta.og_title) fm.ogTitle = meta.og_title;
  if (meta.og_description) fm.ogDescription = meta.og_description;
  if (meta.og_image) fm.ogImage = rewriteUrl(meta.og_image);
  if (meta.twitter_title) fm.twitterTitle = meta.twitter_title;
  if (meta.twitter_description) fm.twitterDescription = meta.twitter_description;
  if (meta.twitter_image) fm.twitterImage = rewriteUrl(meta.twitter_image);
  if (post.canonical_url) fm.canonicalUrl = post.canonical_url;

  return fm;
}

// ─── Main conversion ──────────────────────────────────────────────────────────
const outDir = join(ROOT, 'src/content/posts');
mkdirSync(outDir, { recursive: true });

const warnings = [];
let convertedCount = 0;

for (const post of posts) {
  if (post.status !== 'published' || post.type !== 'post') continue;

  const slug = post.slug;
  const { html: processedHtml } = preprocessHtml(post.html, slug);

  // Convert HTML to Markdown
  let markdown = '';
  try {
    markdown = td.turndown(processedHtml || '');
  } catch (err) {
    warnings.push(`[${slug}] turndown error: ${err.message}`);
    markdown = processedHtml || '';
  }

  // Warn on suspiciously short output
  if (markdown.trim().length < 200) {
    warnings.push(`[${slug}] suspiciously short body: ${markdown.trim().length} chars`);
  }

  // Build frontmatter
  const fm = buildFrontmatter(post);

  // Serialize to YAML (js-yaml handles quoting, colons, emoji safely)
  const yamlStr = yaml.dump(fm, {
    lineWidth: -1,         // no forced line breaks
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });

  const fileContent = `---\n${yamlStr}---\n\n${markdown}\n`;
  writeFileSync(join(outDir, `${slug}.md`), fileContent, 'utf8');
  convertedCount++;
}

// ─── Self-verification ────────────────────────────────────────────────────────
const writtenFiles = readdirSync(outDir).filter(f => f.endsWith('.md'));

console.log('\n=== CONVERSION COMPLETE ===');
console.log(`Files written: ${writtenFiles.length} (expected 41)`);
if (writtenFiles.length !== 41) {
  console.warn(`WARNING: expected 41, got ${writtenFiles.length}`);
}

// Grep for leftover tokens
let leftoverGhostUrl = 0;
let leftoverPostsDomain = 0;
let leftoverSizedImages = 0;
const shortBodies = [];

for (const file of writtenFiles) {
  const content = readFileSync(join(outDir, file), 'utf8');
  const ghostMatches = (content.match(/__GHOST_URL__/g) || []).length;
  const domainMatches = (content.match(/posts\.oztamir\.com/g) || []).length;
  const sizeMatches = (content.match(/\/content\/images\/size\//g) || []).length;

  leftoverGhostUrl += ghostMatches;
  leftoverPostsDomain += domainMatches;
  leftoverSizedImages += sizeMatches;

  // Body length check: strip frontmatter to get body
  const bodyStart = content.indexOf('\n---\n', 4);
  const body = bodyStart >= 0 ? content.slice(bodyStart + 5).trim() : content.trim();
  if (body.length < 200) {
    shortBodies.push(`${file}: ${body.length} chars`);
  }
}

console.log(`\n--- URL Rewrite Verification ---`);
console.log(`Leftover __GHOST_URL__:        ${leftoverGhostUrl} (expected 0)`);
console.log(`Leftover posts.oztamir.com:    ${leftoverPostsDomain} (expected 0)`);
console.log(`Leftover /content/images/size/: ${leftoverSizedImages} (expected 0)`);

console.log(`\n--- Script Reports ---`);
if (scriptReports.length === 0) {
  console.log('No posts contained <script> tags outside embed rules.');
} else {
  for (const r of scriptReports) {
    console.log(`Post: ${r.slug}`);
    for (const s of r.scripts) {
      console.log(`  [${s.type}] src: ${s.src} → ${s.action}`);
    }
  }
}

console.log(`\n--- Short Body Warnings ---`);
if (shortBodies.length === 0) {
  console.log('No posts with suspiciously short bodies (<200 chars).');
} else {
  for (const w of shortBodies) console.log('  WARNING:', w);
}

if (warnings.length > 0) {
  console.log(`\n--- Conversion Warnings ---`);
  for (const w of warnings) console.log(' ', w);
}

console.log('\n=== hello-world.md ===');
const helloWorld = readFileSync(join(outDir, 'hello-world.md'), 'utf8');
console.log(helloWorld);
