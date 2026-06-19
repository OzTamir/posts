/**
 * Author definitions. The blog has a single author.
 * Bio text is preserved verbatim (including the "[REDACTED]" and the
 * "cybersecurtiy" typo — intentional).
 */
export interface Author {
  slug: string;
  name: string;
  bio: string;
  profileImage: string;
  location: string;
  website: string;
  twitter: string;
  facebook: string;
  /** Absolute author archive URL. */
  url: string;
  /** schema.org sameAs links. */
  sameAs: string[];
}

export const AUTHORS: Record<string, Author> = {
  oz: {
    slug: 'oz',
    name: 'Oz Tamir',
    bio: "I'm Oz, 2x Founding Engineer at cybersecurtiy companies like Blockaid and [REDACTED].\n\nI like to write about low level security stuff, build smart home (and adjacent) DIY projects, and shitpost about startup culture.",
    profileImage: '/content/images/2024/06/profile_small-1.png',
    location: 'Terminally Online, Physically TLV',
    website: 'https://oztamir.com/',
    twitter: '@oztamir',
    facebook: 'oztamir',
    url: 'https://posts.oztamir.com/author/oz/',
    sameAs: [
      'https://oztamir.com/',
      'https://www.facebook.com/oztamir',
      'https://x.com/oztamir',
      'https://www.linkedin.com/in/oz-tamir-7179b185',
    ],
  },
};

export const DEFAULT_AUTHOR = AUTHORS.oz;
