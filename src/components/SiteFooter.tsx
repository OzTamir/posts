/**
 * SiteFooter.tsx — the `.site-footer` footer (static React, ships no client JS).
 *
 * Shows: Twitter, LinkedIn, RSS social links + the dark/light theme toggle.
 * The `site-footer-divider` appears only on post pages. Secondary navigation is
 * empty so the footer always carries the `no-menu` modifier.
 *
 * The toggle button is authored here as static markup (Sun icon + "Dark Mode",
 * matching the default theme). Its click behaviour + icon/label swap is wired
 * by a tiny inline script in BaseLayout (the `.theme-icon` / `.theme-text`
 * / `#theme-toggle` hooks), so the toggle ships zero JS bundle — identical to
 * the original behaviour, with no flash of the wrong theme.
 *
 * Styling is expressed as Tailwind utilities bound to the @theme tokens.
 */
import { SITE } from '../config';
import Twitter from './icons/Twitter';
import Linkedin from './icons/Linkedin';
import Rss from './icons/Rss';
import Sun from './icons/Sun';

interface Props {
  /** Render the top divider (shown only on single posts). */
  isPost?: boolean;
}

const socialLinkClass =
  'site-footer-social-link inline-flex items-center text-secondary-text transition-colors hover:text-primary-text [&_.icon]:h-[25px] [&_.icon]:w-[25px]';

export default function SiteFooter({ isPost = false }: Props) {
  return (
    <footer className="site-footer no-menu page-gutter mt-auto whitespace-nowrap py-[2rem] text-secondary-text">
      <div className="site-footer-inner flex flex-col items-center gap-[24px] p-0">
        <div className="site-footer-bottom mt-[2rem] flex flex-col items-center gap-[1rem]">
          {isPost && <div className="site-footer-divider mb-[.5rem] block h-[2px] w-[400px] rounded-[1px] bg-light-gray"></div>}
          <div className="site-footer-social flex justify-center gap-[1rem]">
            {SITE.social.twitter && (
              <a className={socialLinkClass} href={SITE.social.twitter.url} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <Twitter />
              </a>
            )}
            {SITE.social.linkedin && (
              <a className={socialLinkClass} href={SITE.social.linkedin.url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Linkedin />
              </a>
            )}
            <a className={socialLinkClass} href={SITE.social.rss.url} target="_blank" rel="noopener noreferrer" aria-label="RSS Feed">
              <Rss />
            </a>
          </div>
          <button
            className="theme-toggle-wrapper theme-toggle inline-flex cursor-pointer items-center gap-[.5rem] border-none bg-none p-0 transition-opacity hover:opacity-70 [&_.icon]:h-[20px] [&_.icon]:w-[20px] [&_.icon]:text-secondary-text"
            aria-label="Toggle theme"
            id="theme-toggle"
            type="button"
          >
            <span className="theme-icon inline-flex items-center">
              <Sun />
            </span>
            <span className="theme-text text-[1.4rem] text-secondary-text" id="theme-text">
              Dark Mode
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
