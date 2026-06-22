/**
 * Shared post-collection helpers used by all routes.
 *
 * Posts are sorted newest-first by pubDate. Reading time is precomputed
 * from each post's raw body (see utils/format).
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { readingTimeMinutes, formatFeedDate } from './format';
import { slugify } from './slug';

export interface PostWithMeta {
  post: CollectionEntry<'posts'>;
  readingTime: number;
}

/**
 * Flat, serializable projection of a post for feed cards. `PostWithMeta`
 * carries the full content entry, which cannot cross an island boundary, so
 * `PostCard` and the client `Feed` island consume this view instead.
 */
export interface PostCardData {
  /** Canonical post URL, root-relative (e.g. "/my-post/"). */
  url: string;
  title: string;
  excerpt: string;
  /** Pre-formatted feed date, e.g. "Jun 6, 2026". */
  date: string;
  /** Reading time in whole minutes. */
  readingTime: number;
  /** Tag slugs, used for the `.tag-<slug>` card classes. */
  tagSlugs: string[];
}

/** Project a `PostWithMeta` into the flat, serializable card view. */
export function toPostCardData({ post, readingTime }: PostWithMeta): PostCardData {
  return {
    url: `/${post.id}/`,
    title: post.data.title,
    excerpt: post.data.description ?? '',
    date: formatFeedDate(post.data.date),
    readingTime,
    tagSlugs: (post.data.tags ?? []).map((t) => slugify(t)),
  };
}

/** All posts, newest-first, each paired with its reading time (minutes). */
export async function getSortedPosts(): Promise<PostWithMeta[]> {
  const posts = await getCollection('posts');
  return posts
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((post) => ({
      post,
      readingTime: readingTimeMinutes(post.body ?? ''),
    }));
}

/** Posts that include the given tag slug (in pubDate-desc order). */
export function filterByTag(all: PostWithMeta[], tagSlug: string): PostWithMeta[] {
  return all.filter(({ post }) => (post.data.tags ?? []).some((t) => slugify(t) === tagSlug));
}

/** Posts by the given author slug (in pubDate-desc order). */
export function filterByAuthor(all: PostWithMeta[], authorSlug: string): PostWithMeta[] {
  return all.filter(({ post }) => (post.data.author ?? 'oz') === authorSlug);
}

/** Total number of pages for `count` items at `perPage` (minimum 1). */
export function pageCount(count: number, perPage: number): number {
  return Math.max(1, Math.ceil(count / perPage));
}

export interface FeedPage {
  /** Posts on this page (already sliced for the page number). */
  pagePosts: PostWithMeta[];
  /** Total pages across the whole filtered list. */
  totalPages: number;
  /** Root-relative URL of the next page, or undefined on the last page. */
  nextUrl?: string;
  /** Root-relative URL of the previous page, or undefined on page 1. */
  prevUrl?: string;
}

/**
 * Shared feed pagination for the home / tag / author views (and their
 * /page/N/ pages), so the slice + next/prev URL logic lives in one place.
 *
 * `basePath` is the section root WITHOUT a trailing slash: '' for home
 * (URLs like /page/2/), '/tag/<slug>' or '/author/<slug>' for archives.
 * Page 1's prev is the base ('/'+basePath+'/'); /page/1/ is never emitted
 * (a redirect canonicalises it).
 */
export function paginatePosts(
  all: PostWithMeta[],
  page: number,
  perPage: number,
  basePath: string,
): FeedPage {
  const totalPages = pageCount(all.length, perPage);
  const start = (page - 1) * perPage;
  const pagePosts = all.slice(start, start + perPage);
  const base = `${basePath}/`; // '/', '/tag/<slug>/', '/author/<slug>/'

  const nextUrl = page < totalPages ? `${basePath}/page/${page + 1}/` : undefined;
  const prevUrl =
    page <= 1 ? undefined : page === 2 ? base : `${basePath}/page/${page - 1}/`;

  return { pagePosts, totalPages, nextUrl, prevUrl };
}

/**
 * Related posts for a single post: up to `limit` other posts that share
 * at least one tag with the current post, newest-first, excluding itself.
 */
export function getRelated(
  all: PostWithMeta[],
  current: CollectionEntry<'posts'>,
  limit = 5,
): PostWithMeta[] {
  const tagSlugs = new Set((current.data.tags ?? []).map((t) => slugify(t)));
  if (tagSlugs.size === 0) return [];
  return all
    .filter(({ post }) => post.id !== current.id)
    .filter(({ post }) => (post.data.tags ?? []).some((t) => tagSlugs.has(slugify(t))))
    .slice(0, limit);
}
