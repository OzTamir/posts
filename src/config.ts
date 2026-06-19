/**
 * Site-wide configuration.
 * Production domain lives here as the single source of truth — change `url`
 * if the site is ever served from a different host.
 */
export const SITE = {
  title: '0xZ',
  description: '# cat /dev/brain >> posts',
  url: 'https://posts.oztamir.com',
  lang: 'en',
  locale: 'en-US',
  timezone: 'Asia/Jerusalem',
  postsPerPage: 5,

  // SEO defaults.
  metaTitle: '0xZ | Posts',
  metaDescription:
    'Shitposts about cybersecurity, home automation, DIY, AI, and everything else in the world.',
  ogTitle: 'Read posts from 0xZ',
  ogDescription:
    'Shitposts about cybersecurity, home automation, DIY, AI, and everything else in the world.',
  twitterTitle: 'Read posts from 0xZ',
  twitterDescription:
    'Shitposts about cybersecurity, home automation, DIY, AI, and everything else in the world.',

  // Brand imagery (favicon, publisher logo, home Open Graph / Twitter image)
  // lives in ONE place: `src/data/site-images.ts`, where the PNGs are imported
  // through Astro's asset pipeline. Consumers read the optimized assets from
  // `SITE_IMAGES` (favicon + cover in components, publisher logo in Head's
  // JSON-LD, home OG/Twitter in the index routes) — no `/content/...` literals
  // ship and there is no duplicated path config here.

  /**
   * Single source of truth for social / identity links.
   * The footer, author card, and JSON-LD `sameAs` all read from this map
   * (no hardcoded URLs elsewhere). `handle` is the bare username where it
   * applies; `url` is the canonical profile link.
   */
  social: {
    twitter: { handle: '@oztamir', url: 'https://x.com/oztamir' },
    facebook: { handle: 'oztamir', url: 'https://www.facebook.com/oztamir' },
    linkedin: { url: 'https://www.linkedin.com/in/oz-tamir-7179b185' },
    // The RSS feed is served at /rss.xml (a 301 keeps /rss/ working forever).
    rss: { url: '/rss.xml' },
  },

  navigation: [] as { label: string; url: string }[],
  secondaryNavigation: [] as { label: string; url: string }[],

  // Analytics: Plausible.
  plausibleDomain: 'posts.oztamir.com',
} as const;

export type SiteConfig = typeof SITE;
