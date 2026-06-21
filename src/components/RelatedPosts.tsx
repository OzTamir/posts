/**
 * RelatedPosts.tsx — the "Hungry for more?" section after a post.
 * Shows up to 5 posts that share at least one tag with the current post,
 * excluding the current post, rendered using the same PostCard markup.
 *
 * The set is computed by the route ([slug].astro) and passed in with reading
 * times already attached. The wrapper styling is expressed as Tailwind
 * utilities bound to the @theme tokens.
 */
import { toPostCardData, type PostWithMeta } from '../utils/posts';
import PostCard from './PostCard';

interface Props {
  related: PostWithMeta[];
}

export default function RelatedPosts({ related }: Props) {
  if (related.length === 0) return null;
  return (
    <section className="related-wrapper content-grid mt-[40px] bg-lighter-gray pt-[56px] pb-[32px]">
      <h3 className="related-title mb-[20px] text-[2.1rem]">Hungry for more?</h3>
      <div className="related-feed">
        {related.map((item) => (
          <PostCard key={item.post.id} data={toPostCardData(item)} />
        ))}
      </div>
    </section>
  );
}
