/**
 * PostFeed.tsx — the shared `.post-feed` grid: a `.post-feed content-grid`
 * wrapper with one `<PostCard>` per item.
 *
 * Used directly by the static /page/N/ routes, and by the client `Feed`
 * island to render the slice of posts currently revealed. Takes the flat,
 * serializable `PostCardData` so both paths share it.
 *
 * The `.post-feed.content-grid` styling (named-grid + responsive font
 * cascade) lives in @layer components.
 */
import type { PostCardData } from '../utils/posts';
import PostCard from './PostCard';

interface Props {
  posts: PostCardData[];
}

export default function PostFeed({ posts }: Props) {
  return (
    <div className="post-feed content-grid">
      {posts.map((post) => (
        <PostCard key={post.url} data={post} />
      ))}
    </div>
  );
}
