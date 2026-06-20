/**
 * PostCard.tsx — a single feed item.
 * Used on the home feed, tag/author archives, the related list, and inside
 * the hydrated `Feed` island.
 *
 * Layout: feed-content (title + description) | feed-metadata (date + reading
 * time) + a full-card overlay <a class="u-permalink">.
 *
 * Takes a flat, serializable `PostCardData` (see utils/posts) rather than the
 * content entry, so the same component renders server-side and inside the
 * client island. The `tag-<slug>` classes keep any `.tag-*` CSS hooks working.
 * The `.feed*` styling lives in @layer components.
 */
import type { PostCardData } from '../utils/posts';

interface Props {
  data: PostCardData;
}

export default function PostCard({ data }: Props) {
  const { url, title, excerpt, date, readingTime, tagSlugs } = data;
  const tagClasses = tagSlugs.map((slug) => `tag-${slug}`).join(' ');

  return (
    <article className={`feed public post ${tagClasses}`.trim()}>
      <div className="feed-content">
        <h2 className="feed-title">{title}</h2>
        <div className="feed-description">{excerpt}</div>
      </div>

      <div className="feed-metadata">
        <div className="feed-date">{date}</div>
        <div className="feed-reading-time">{readingTime} min read</div>
      </div>

      <a className="u-permalink" href={url} aria-label={title}></a>
    </article>
  );
}
