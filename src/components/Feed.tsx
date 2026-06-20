/**
 * Feed.tsx — the home/tag/author feed with an in-place "Load more".
 *
 * Hydrated as an island (`client:visible`) on a section's first page. It
 * receives the WHOLE feed up front and reveals `perPage` more cards per click
 * — no navigation, no network request. The button is a real <a href> to
 * /…/page/2/, so when the island is not hydrated (no JS) the click falls
 * through and navigates to the static paginated page instead. Those static
 * /page/N/ routes render `PostFeed` + `Pagination` directly for the no-JS and
 * crawler path.
 */
import { useState } from 'react';
import type { PostCardData } from '../utils/posts';
import PostFeed from './PostFeed';

interface Props {
  /** The entire feed, newest-first. Only the first `perPage` show initially. */
  posts: PostCardData[];
  /** Cards to reveal per click (and to show on first paint). */
  perPage: number;
  /** Root-relative URL of page 2 — the no-JS fallback target for the button. */
  nextHref?: string;
}

export default function Feed({ posts, perPage, nextHref }: Props) {
  const [shown, setShown] = useState(perPage);
  const hasMore = shown < posts.length;

  return (
    <>
      <PostFeed posts={posts.slice(0, shown)} />

      {hasMore && (
        <nav className="load-more mt-[48px] flex justify-center">
          <a
            href={nextHref}
            onClick={(event) => {
              event.preventDefault();
              setShown((count) => count + perPage);
            }}
            className="button button-secondary gh-loadmore inline-flex h-[36px] cursor-pointer items-center justify-center rounded-[3px] border border-light-gray bg-bg px-[15px] text-[11px] font-extrabold uppercase tracking-[.5px] text-darker-gray transition-colors hover:border-brand hover:text-brand hover:opacity-100"
          >
            Load more
          </a>
        </nav>
      )}
    </>
  );
}
