/**
 * PostLayout.tsx — the single-post scaffold (static React).
 *
 * Renders the article body that lives inside BaseLayout's main slot:
 *   <div class="site-content">
 *     <main class="site-main">
 *       <article class="single post tag-…">
 *         <header class="single-header gh-canvas"> meta · title · excerpt · feature image </header>
 *         <div class="single-content gh-content gh-canvas"> {children} + FIN divider </div>
 *       </article>
 *       <RelatedPosts/>            (related-wrapper)
 *       <div class="gh-canvas"><footer class="single-footer"> author bio </footer></div>
 *     </main>
 *   </div>
 *
 * The rendered Markdown is passed in as `children` (Astro forwards the route's
 * <Content /> as the default slot). The PhotoSwipe markup + the EmbedLoader
 * island are mounted by the route via BaseLayout's `after` slot, so this
 * component stays fully static (no client JS).
 *
 * The `.single-*` header/footer styling is parity-critical responsive layout
 * kept in @layer components; the meta separators use the `.single-meta-item`
 * pseudo-element hook.
 */
import type { ReactNode } from 'react';
import type { CollectionEntry } from 'astro:content';
import RelatedPosts from '../components/RelatedPosts';
import { AUTHORS, DEFAULT_AUTHOR } from '../data/authors';
import { formatPostDate, dateAttr } from '../utils/format';

interface RelatedItem {
  post: CollectionEntry<'posts'>;
  readingTime: number;
}
interface Props {
  post: CollectionEntry<'posts'>;
  readingTime: number;
  related: RelatedItem[];
  /** The rendered Markdown body (forwarded from the route's <Content />). */
  children?: ReactNode;
}

export default function PostLayout({ post, readingTime, related, children }: Props) {
  const d = post.data;
  const author = AUTHORS[d.author] ?? DEFAULT_AUTHOR;
  const primaryTag = d.tags?.[0];

  // Article class: "post tag-<slug> …" for each tag.
  const tagClasses = (d.tags ?? []).map((t) => `tag-${t.slug}`).join(' ');

  // Feature image — original path; CSS controls sizing.
  const featureImage = d.featureImage ?? null;
  const featureAlt = d.featureImageAlt || d.title;

  // Author avatar — original path; CSS controls sizing.
  const authorAvatar = author.profileImage;

  return (
    <div className="site-content">
      <main className="site-main">
        <article className={`single post ${tagClasses}`.trim()}>
          <header className="single-header gh-canvas">
            <div className="single-meta">
              <span className="single-meta-item single-meta-date">
                <time dateTime={dateAttr(d.pubDate)}>{formatPostDate(d.pubDate)}</time>
              </span>
              <span className="single-meta-item single-meta-length">{readingTime} min read</span>
              {primaryTag && (
                <span className="single-meta-item single-meta-tag">
                  <a className={`post-tag post-tag-${primaryTag.slug}`} href={`/tag/${primaryTag.slug}/`}>
                    {primaryTag.name}
                  </a>
                </span>
              )}
            </div>

            <h1 className="single-title">{d.title}</h1>

            {d.excerpt && <div className="single-excerpt">{d.excerpt}</div>}

            {featureImage && (
              <figure className="single-media kg-width-wide">
                <div className="u-placeholder horizontal">
                  <img
                    className="u-object-fit"
                    sizes="(min-width: 1200px) 920px, 92vw"
                    src={featureImage}
                    alt={featureAlt}
                  />
                </div>
                {d.featureImageCaption && (
                  <figcaption dangerouslySetInnerHTML={{ __html: d.featureImageCaption }} />
                )}
              </figure>
            )}
          </header>

          <div className="single-content gh-content gh-canvas">
            {children}
            {/* End-of-post "FIN" divider. */}
            <div style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <span style={{ flex: 1, maxWidth: '100px', height: '1px', backgroundColor: 'var(--light-gray-color)' }}></span>
              <code>FIN</code>
              <span style={{ flex: 1, maxWidth: '100px', height: '1px', backgroundColor: 'var(--light-gray-color)' }}></span>
            </div>
          </div>
        </article>

        <RelatedPosts related={related} />

        <div className="gh-canvas">
          <footer className="single-footer">
            <div className="single-footer-author">
              <div className="author-image-column">
                <div className="author-image-placeholder u-placeholder square">
                  <a href={`/author/${author.slug}/`} title={author.name}>
                    <img className="author-image u-object-fit" src={authorAvatar} alt={author.name} loading="lazy" />
                  </a>
                </div>
              </div>
              <div className="author-content-column">
                <h3 className="single-footer-title">About Me</h3>
                <div className="author-bio">{author.bio}</div>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
