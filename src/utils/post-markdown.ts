/**
 * post-markdown.ts — render a post's source MDX body to plain Markdown for the
 * `Accept: text/markdown` content-negotiation path (see worker/index.ts).
 *
 * The MDX body is already Markdown except for the import header and the four
 * embed components. We strip the imports and rewrite each component to a
 * Markdown equivalent, resolving image/video URLs through the SAME helpers the
 * components use — so links point at the real built `/_astro/*` assets and
 * never drift from what the HTML page shows. No HTML parsing, no extra deps.
 */
import { getImage } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import { resolveImage, isGif } from '../components/mdx/images';
import { resolveVideo } from '../components/mdx/media';
import { SITE } from '../config';

/** Pull `key="value"` string attributes out of a JSX-ish tag's attribute text. */
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/(\w+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

/** String.replace with an async replacer (needed for getImage()). */
async function replaceAsync(
  input: string,
  re: RegExp,
  fn: (m: RegExpMatchArray) => Promise<string>,
): Promise<string> {
  const matches = [...input.matchAll(re)];
  let out = '';
  let last = 0;
  for (const m of matches) {
    out += input.slice(last, m.index);
    out += await fn(m);
    last = (m.index ?? 0) + m[0].length;
  }
  return out + input.slice(last);
}

/** Resolve a post image path to a real, build-emitted URL (mirrors <Figure>). */
async function imageUrl(src: string): Promise<string> {
  if (/^https?:\/\//.test(src)) return src;
  const asset = resolveImage(src);
  // GIFs are kept verbatim (the page does too); everything else goes through
  // the optimizer, which is what guarantees the URL is emitted to dist.
  return isGif(asset) ? asset.src : (await getImage({ src: asset })).src;
}

export async function postToMarkdown(post: CollectionEntry<'posts'>): Promise<string> {
  const d = post.data;
  let body = post.body ?? '';

  // 1. Drop the `import … from '…';` component header.
  body = body.replace(/^import\s+.+\s+from\s+['"].+['"];?\s*$/gm, '');

  // 2. <Figure src alt caption /> → Markdown image (+ italic caption).
  body = await replaceAsync(body, /<Figure\b([\s\S]*?)\/>/g, async (m) => {
    const a = attrs(m[1]);
    if (!a.src) return '';
    const url = await imageUrl(a.src);
    const img = `![${a.alt ?? ''}](${url})`;
    return a.caption ? `${img}\n\n*${a.caption}*` : img;
  });

  // 3. <Video src title /> → link (Markdown can't embed a player).
  body = await replaceAsync(body, /<Video\b([\s\S]*?)\/>/g, async (m) => {
    const a = attrs(m[1]);
    if (!a.src) return '';
    const url = resolveVideo(a.src);
    const link = `[${a.title || 'Video'}](${url})`;
    return a.caption ? `${link}\n\n*${a.caption}*` : link;
  });

  // 4. <Tweet>…</Tweet> / <Instagram permalink>…</Instagram> → blockquoted link.
  body = body.replace(/<Tweet\b[^>]*>([\s\S]*?)<\/Tweet>/g, (_m, inner: string) => {
    const href = inner.match(/href="(https?:\/\/[^"]*(?:twitter|x)\.com[^"]*)"/i)?.[1];
    return href ? `> [View tweet](${href})` : '';
  });
  body = body.replace(/<Instagram\b([^>]*)>[\s\S]*?<\/Instagram>/g, (_m, tag: string) => {
    const href = attrs(tag).permalink;
    return href ? `> [View on Instagram](${href})` : '';
  });

  // Collapse the blank lines left by the removed imports/components.
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  // Header: title, a one-line provenance note, optional excerpt + cover image.
  const url = `${SITE.url}/${post.id}/`;
  const date = d.date.toISOString().slice(0, 10);
  const parts = [`# ${d.title}`, `*${date} · [${url}](${url})*`];
  if (d.description) parts.push(`> ${d.description}`);
  if (d.image) parts.push(`![${d.imageAlt ?? ''}](${await imageUrl(d.image)})`);
  parts.push(body);
  return parts.join('\n\n') + '\n';
}
