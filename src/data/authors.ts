/**
 * Author definitions. The blog has a single author.
 * Bio text is preserved verbatim (the "[REDACTED]" is intentional).
 *
 * Social links are NOT hardcoded here — they derive from `SITE.social`
 * (the single source of truth), so the footer, author card, and JSON-LD
 * `sameAs` all stay in sync from one place.
 */
import { SITE } from '../config';

export interface Author {
  slug: string;
  name: string;
  bio: string;
  profileImage: string;
  location: string;
  website: string;
  /** Bare Twitter handle (e.g. "@oztamir"), from SITE.social. */
  twitter: string;
  /** Bare Facebook username, from SITE.social. */
  facebook: string;
  /** LinkedIn profile URL, from SITE.social. */
  linkedin: string;
  /** Absolute author archive URL. */
  url: string;
  /** schema.org sameAs links. */
  sameAs: string[];
}

export const AUTHORS: Record<string, Author> = {
  oz: {
    slug: 'oz',
    name: 'Oz Tamir',
    bio: "I'm Oz, 2x Founding Engineer at cybersecurity companies like Blockaid and [REDACTED].\n\nI like to write about low level security stuff, build smart home (and adjacent) DIY projects, and shitpost about startup culture.",
    profileImage: '/content/images/2024/06/profile_small-1.png',
    location: 'Terminally Online, Physically TLV',
    website: 'https://oztamir.com/',
    twitter: SITE.social.twitter.handle,
    facebook: SITE.social.facebook.handle,
    linkedin: SITE.social.linkedin.url,
    url: 'https://posts.oztamir.com/author/oz/',
    sameAs: [
      'https://oztamir.com/',
      SITE.social.facebook.url,
      SITE.social.twitter.url,
      SITE.social.linkedin.url,
    ],
  },
};

export const DEFAULT_AUTHOR = AUTHORS.oz;
