/**
 * Site-wide configuration, mirrored 1:1 from the Ghost settings export.
 * Production domain lives here as the single source of truth — change `url`
 * if the site is ever served from a different host.
 */
export const SITE = {
  title: '0xZ',
  description: '# cat /dev/brain >> posts',
  url: 'https://posts.oztamir.com',
  lang: 'en',
  locale: 'en',
  timezone: 'Asia/Jerusalem',
  postsPerPage: 5, // Dawn theme config.posts_per_page

  accentColor: '#ffd102',

  // SEO defaults (Ghost settings). Note the verbatim casing in the OG/Twitter
  // titles ("OxZ" vs "0xZ") — preserved exactly as on the live site.
  metaTitle: '0xZ | Posts',
  metaDescription:
    'Shitposts about cybersecurity, home automation, DIY, AI, and everything else in the world.',
  ogTitle: 'Read posts from OxZ',
  ogDescription:
    'Shitposts about cybersecurity, home automation, DIY, AI, and everything else in the world.',
  ogImage: '/content/images/2020/07/android-chrome-512x512.png',
  twitterTitle: 'Read posts from 0xZ',
  twitterDescription:
    'Shitposts about cybersecurity, home automation, DIY, AI, and everything else in the world.',
  twitterImage: '/content/images/2024/07/android-chrome-512x512-1.png',

  logo: '/content/images/2024/07/android-chrome-512x512-1.png',
  icon: '/content/images/2024/07/android-chrome-512x512.png',

  // Social (only facebook + twitter are set in Ghost; others are null)
  twitter: '@oztamir',
  twitterUrl: 'https://x.com/oztamir',
  facebook: 'oztamir',
  facebookUrl: 'https://www.facebook.com/oztamir',

  // Ghost navigation + secondary_navigation are both empty arrays.
  navigation: [] as { label: string; url: string }[],
  secondaryNavigation: [] as { label: string; url: string }[],

  // Analytics: Plausible only (Matomo dropped during migration, per owner).
  plausibleDomain: 'posts.oztamir.com',
} as const;

export type SiteConfig = typeof SITE;
