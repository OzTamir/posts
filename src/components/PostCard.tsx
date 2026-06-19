/**
 * PostCard.tsx — a single feed item.
 * Used on the home feed, tag/author archives, and the related list.
 *
 * Layout: feed-content (title + description) | feed-metadata (date + reading
 * time) + a full-card overlay <a class="u-permalink">.
 *
 * The article's tag classes (tag-<slug> …) are built from the post's tags so
 * any `.tag-*` CSS hooks still apply. The `.feed*` styling (an IBM Plex Mono
 * card whose font sizes scale with the grid's --content-width across
 * breakpoints) lives in @layer components.
 */
import type { CollectionEntry } from 'astro:content';
import { formatFeedDate } from '../utils/format';

interface Props {
  post: CollectionEntry<'posts'>;
  /** Reading time in minutes (computed by the route from the body). */
  readingTime: number;
}

export default function PostCard({ post, readingTime }: Props) {
  const { title, excerpt, pubDate, tags } = post.data;

  // Build article class: "post" + tag-<slug> for each tag.
  const tagClasses = (tags ?? []).map((t) => `tag-${t.slug}`).join(' ');
  const href = `/${post.id}/`;

  return (
    <article className={`feed public post ${tagClasses}`.trim()}>
      <div className="feed-content">
        <h2 className="feed-title">{title}</h2>
        <div className="feed-description">{excerpt}</div>
      </div>

      <div className="feed-metadata">
        <div className="feed-date">{formatFeedDate(pubDate)}</div>
        <div className="feed-reading-time">{readingTime} min read</div>
      </div>

      <a className="u-permalink" href={href} aria-label={title}></a>
    </article>
  );
}
