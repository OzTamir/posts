/**
 * AuthorCard.tsx — the author-archive header.
 * Shows the author avatar, name (linked to their website), location meta,
 * bio, and the Facebook / Twitter / LinkedIn share links.
 *
 * Styling is expressed as Tailwind utilities bound to the @theme tokens. The
 * share links keep their `.share-link*` class hooks so the dark-mode color
 * override in @layer components still applies; the round avatar uses the
 * `.u-placeholder`/`.u-object-fit` utility hooks.
 */
import type { Author } from '../data/authors';
import Facebook from './icons/Facebook';
import Twitter from './icons/Twitter';
import Linkedin from './icons/Linkedin';

interface Props {
  author: Author;
}

// The share buttons are styled in @layer components (.share-link*) so the
// dark-mode color override wins over the base brand background.
const shareLinkClass = 'share-link author-social-item';

export default function AuthorCard({ author }: Props) {
  // Avatar — CSS controls sizing; we reference the original path.
  const avatar = author.profileImage;

  return (
    <section className="author content-grid mb-[4.5rem] flex flex-col items-center text-center">
      <div className="author-image-placeholder u-placeholder square mb-[2rem] w-[70px] shrink-0 overflow-hidden rounded-full">
        <img className="author-image u-object-fit" src={avatar} alt={author.name} />
      </div>

      {author.website ? (
        <h1 className="author-name mb-0 text-[2.4rem]">
          <a href={author.website} target="_blank" rel="noopener noreferrer">
            {author.name}
          </a>
        </h1>
      ) : (
        <h1 className="author-name mb-0 text-[2.4rem]">{author.name}</h1>
      )}

      {author.location && (
        <span className="author-meta mt-[8px] text-[1.2rem] font-extrabold uppercase text-secondary-text">
          {author.location}
        </span>
      )}

      <div className="author-bio mx-auto mt-[16px] max-w-[520px] text-[1.5rem] leading-[1.6] text-secondary-text">
        {author.bio}
      </div>

      <div className="share author-social mt-[2rem] flex gap-[.4rem]">
        {author.facebook && (
          <a
            className={`${shareLinkClass} share-link-facebook`}
            href={`https://www.facebook.com/${author.facebook}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Facebook />
            Facebook
          </a>
        )}
        {author.twitter && (
          <a
            className={`${shareLinkClass} share-link-twitter`}
            href={`https://x.com/${author.twitter.replace(/^@/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Twitter />
            Twitter
          </a>
        )}
        {author.linkedin && (
          <a
            className={`${shareLinkClass} share-link-linkedin`}
            href={author.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Linkedin />
            LinkedIn
          </a>
        )}
      </div>
    </section>
  );
}
