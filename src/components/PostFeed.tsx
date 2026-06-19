/**
 * PostFeed.tsx — the shared `.post-feed` grid used by every paginated view
 * (home, tag archive, author archive, and their /page/N/ pages).
 *
 * Previously each of the six route files inlined the same
 * `<div class="post-feed post-list post-canvas">{posts.map(<PostCard/>)}</div>`.
 * Centralising it here keeps the markup in one place; the output is byte-for-
 * byte identical to the prior inline version.
 *
 * The `.post-feed.post-list.post-canvas` styling (the named-grid + responsive
 * font cascade) lives in @layer components.
 */
import type { CollectionEntry } from 'astro:content';
import PostCard from './PostCard';

interface FeedItem {
  post: CollectionEntry<'posts'>;
  readingTime: number;
}

interface Props {
  posts: FeedItem[];
}

export default function PostFeed({ posts }: Props) {
  return (
    <div className="post-feed post-list post-canvas">
      {posts.map(({ post, readingTime }) => (
        <PostCard key={post.id} post={post} readingTime={readingTime} />
      ))}
    </div>
  );
}
