/**
 * post-markdown.ts — render a post's source Markdown body for the
 * `Accept: text/markdown` content-negotiation path (see worker/index.ts).
 *
 * All 42 posts are now native folder-based `.md` — no JSX components.
 * We just strip frontmatter and serve the raw body, prepending a small
 * header block (title, date, URL, description, feature image).
 */
import { getImage } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import { resolveImage, isGif, resolveFeatureImagePath } from './images';
import { SITE } from '../config';

/** Resolve a post image path to a real, build-emitted URL. */
async function imageUrl(src: string): Promise<string> {
  if (/^https?:\/\//.test(src)) return src;
  const asset = resolveImage(src);
  return isGif(asset) ? asset.src : (await getImage({ src: asset })).src;
}

export async function postToMarkdown(post: CollectionEntry<'posts'>): Promise<string> {
  const d = post.data;
  const body = (post.body ?? '').trim();

  // Header: title, a one-line provenance note, optional excerpt + cover image.
  const url = `${SITE.url}/${post.id}/`;
  const date = d.date.toISOString().slice(0, 10);
  const parts = [`# ${d.title}`, `*${date} · [${url}](${url})*`];
  if (d.description) parts.push(`> ${d.description}`);
  const featureImgPath = resolveFeatureImagePath(post.id, d.image);
  if (featureImgPath) parts.push(`![${d.imageAlt ?? ''}](${await imageUrl(featureImgPath)})`);
  parts.push(body);
  return parts.join('\n\n') + '\n';
}
