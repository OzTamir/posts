/**
 * Head.tsx — the <head> contents for each page type
 * (home / post / tag / author / 404).
 *
 * Emits: charset, viewport, title, description, favicon, canonical,
 * Open Graph, Twitter card, JSON-LD, RSS alternate link, Plausible
 * analytics, and the accent-color CSS variable.
 *
 * All og:image / twitter:image / canonical URLs are emitted ABSOLUTE
 * (https://posts.oztamir.com/...).
 *
 * Rendered (un-hydrated) inside the Astro <head>, so it ships no client JS.
 */
import { SITE } from '../config';
import { AUTHORS } from '../data/authors';

type PageType = 'home' | 'post' | 'tag' | 'author' | 'page' | 'default';

export interface HeadProps {
  type: PageType;
  /** Document <title>. For posts this is the post title (no site suffix). */
  title: string;
  /** Meta description. */
  description?: string;
  /** og:title / twitter:title overrides (default to `title`). */
  ogTitle?: string;
  twitterTitle?: string;
  /** og:description / twitter:description overrides (default to `description`). */
  ogDescription?: string;
  twitterDescription?: string;
  /** Absolute canonical URL (with trailing slash). */
  canonical: string;
  /** rel=next URL (pagination), absolute. */
  next?: string;
  /** rel=prev URL (pagination), absolute. */
  prev?: string;

  /* Post-specific ------------------------------------------------------ */
  ogImage?: string | null; // absolute or site-relative; normalised below
  twitterImage?: string | null;
  ogImageWidth?: number;
  ogImageHeight?: number;
  publishedTime?: string; // ISO
  modifiedTime?: string; // ISO
  primaryTag?: string; // tag NAME (for article:tag / keywords / filed-under)
  authorName?: string;
  authorSlug?: string;

  /* Tag / author archive ---------------------------------------------- */
  ogType?: string; // override og:type
  twitterCard?: 'summary' | 'summary_large_image';
}

/** Turn a site-relative path into an absolute https URL on the site host. */
const abs = (u?: string | null): string | undefined => {
  if (!u) return undefined;
  if (/^https?:\/\//.test(u)) return u;
  return `${SITE.url}${u.startsWith('/') ? '' : '/'}${u}`;
};

export default function Head(props: HeadProps) {
  const {
    type,
    title,
    description,
    ogTitle,
    twitterTitle,
    ogDescription,
    twitterDescription,
    canonical,
    next,
    prev,
    ogImage,
    twitterImage,
    ogImageWidth,
    ogImageHeight,
    publishedTime,
    modifiedTime,
    primaryTag,
    authorName,
    authorSlug,
    ogType,
    twitterCard,
  } = props;

  const resolvedOgType =
    ogType ??
    (type === 'post' ? 'article' : type === 'author' ? 'profile' : type === 'tag' ? 'website' : 'website');

  // Twitter card type: large image for home + posts, summary for tag/author.
  const resolvedTwitterCard =
    twitterCard ?? (type === 'tag' || type === 'author' ? 'summary' : 'summary_large_image');

  const ogImageAbs = abs(ogImage);
  const twitterImageAbs = abs(twitterImage);

  // Social titles/descriptions fall back to the document title/description.
  const resolvedOgTitle = ogTitle ?? title;
  const resolvedTwitterTitle = twitterTitle ?? title;
  const resolvedOgDescription = ogDescription ?? description;
  const resolvedTwitterDescription = twitterDescription ?? description;

  // Author JSON-LD bits (single author site).
  const author = authorSlug ? AUTHORS[authorSlug] : undefined;

  /* ---------- JSON-LD per page type ---------- */
  // Publisher logo + author image derive from SITE/author config (no
  // hardcoded /content/... literals). The logo asset is 512×512.
  const orgPublisher = {
    '@type': 'Organization',
    name: SITE.title,
    url: `${SITE.url}/`,
    logo: {
      '@type': 'ImageObject',
      url: abs(SITE.logo),
      width: 512,
      height: 512,
    },
  };

  let jsonLd: Record<string, unknown> | null = null;
  if (type === 'home') {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      publisher: orgPublisher,
      url: `${SITE.url}/`,
      name: SITE.title,
      mainEntityOfPage: `${SITE.url}/`,
      description: description ?? SITE.metaDescription,
    };
  } else if (type === 'tag') {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Series',
      publisher: orgPublisher,
      url: canonical,
      name: primaryTag ?? title,
      mainEntityOfPage: canonical,
    };
  } else if (type === 'author' && author) {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      sameAs: author.sameAs,
      name: author.name,
      url: author.url,
      mainEntityOfPage: author.url,
      description: author.bio,
    };
  } else if (type === 'post') {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      publisher: orgPublisher,
      ...(author
        ? {
            author: {
              '@type': 'Person',
              name: author.name,
              image: {
                '@type': 'ImageObject',
                // Derived from the author's real profile image (was a 404
                // pointing at a nonexistent /size/w1200/ derivative).
                url: abs(author.profileImage),
              },
              url: author.url,
              sameAs: author.sameAs,
            },
          }
        : {}),
      headline: title,
      url: canonical,
      ...(publishedTime ? { datePublished: publishedTime } : {}),
      ...(modifiedTime ? { dateModified: modifiedTime } : {}),
      ...(ogImageAbs
        ? {
            image: {
              '@type': 'ImageObject',
              url: ogImageAbs,
              ...(ogImageWidth ? { width: ogImageWidth } : {}),
              ...(ogImageHeight ? { height: ogImageHeight } : {}),
            },
          }
        : {}),
      ...(primaryTag ? { keywords: primaryTag } : {}),
      ...(description ? { description } : {}),
      mainEntityOfPage: canonical,
    };
  }

  return (
    <>
      {/* charset + viewport are emitted by BaseLayout.astro (so the charset
          declaration renders lowercase and stays first in <head>). */}
      <title>{title}</title>

      {description && <meta name="description" content={description} />}
      <link rel="icon" href={SITE.icon} type="image/png" />
      <link rel="canonical" href={canonical} />
      <meta name="referrer" content="no-referrer-when-downgrade" />
      {next && <link rel="next" href={next} />}
      {prev && <link rel="prev" href={prev} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE.title} />
      <meta property="og:type" content={resolvedOgType} />
      <meta property="og:title" content={resolvedOgTitle} />
      {resolvedOgDescription && <meta property="og:description" content={resolvedOgDescription} />}
      <meta property="og:url" content={canonical} />
      {ogImageAbs && <meta property="og:image" content={ogImageAbs} />}
      {type === 'post' && publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {type === 'post' && modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {type === 'post' && primaryTag && <meta property="article:tag" content={primaryTag} />}
      <meta property="article:publisher" content={SITE.social.facebook.url} />
      {(type === 'post' || type === 'author') && <meta property="article:author" content={SITE.social.facebook.url} />}

      {/* Twitter card */}
      <meta name="twitter:card" content={resolvedTwitterCard} />
      <meta name="twitter:title" content={resolvedTwitterTitle} />
      {resolvedTwitterDescription && <meta name="twitter:description" content={resolvedTwitterDescription} />}
      <meta name="twitter:url" content={canonical} />
      {twitterImageAbs && <meta name="twitter:image" content={twitterImageAbs} />}
      {type === 'post' && authorName && (
        <>
          <meta name="twitter:label1" content="Written by" />
          <meta name="twitter:data1" content={authorName} />
        </>
      )}
      {type === 'post' && primaryTag && (
        <>
          <meta name="twitter:label2" content="Filed under" />
          <meta name="twitter:data2" content={primaryTag} />
        </>
      )}
      <meta name="twitter:site" content={SITE.social.twitter.handle} />
      {(type === 'post' || type === 'author') && <meta name="twitter:creator" content={SITE.social.twitter.handle} />}
      {type === 'home' && ogImageAbs && (
        <>
          <meta property="og:image:width" content="512" />
          <meta property="og:image:height" content="512" />
        </>
      )}
      {type === 'post' && ogImageAbs && ogImageWidth && ogImageHeight && (
        <>
          <meta property="og:image:width" content={String(ogImageWidth)} />
          <meta property="og:image:height" content={String(ogImageHeight)} />
        </>
      )}

      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd, null, 4) }} />
      )}

      <meta name="generator" content="Astro" />
      <link rel="alternate" type="application/rss+xml" title={SITE.title} href="/rss/" />

      {/* Plausible analytics. */}
      <script defer data-domain={SITE.plausibleDomain} src="https://plausible.io/js/plausible.js"></script>
    </>
  );
}
