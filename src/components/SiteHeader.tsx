/**
 * SiteHeader.tsx — the `#site-head` header, rendered on every page except home
 * (which uses the Cover component instead).
 *
 * The primary nav renders from SITE.navigation: with the default empty array
 * nothing shows (only the logo), so the look is unchanged — but adding an item
 * to config produces a real nav link. The empty <div class="site-head-actions">
 * is kept because the CSS grid layout depends on it being present. Site search
 * is not implemented.
 *
 * The grid layout lives in @layer components (.site-head*) — it's a named
 * responsive grid that can't be expressed cleanly as inline utilities. Nav
 * links are styled to match the header (the .site-head-menu cascade sets the
 * font size/weight; the per-link utilities add the hover/accent treatment).
 */
import { SITE } from '../config';
import { SITE_IMAGES } from '../data/site-images';

const navLinkClass =
  'site-head-link text-primary-text transition-colors hover:text-brand hover:opacity-100';

export default function SiteHeader() {
  return (
    <header id="site-head" className="site-head site-outer">
      <div className="site-head-inner site-inner">
        <div className="site-head-brand">
          <div className="site-head-brand-wrapper">
            <a className="site-head-logo" href="/">
              {/* Single logo image (optimized asset). */}
              <img src={SITE_IMAGES.logo.src} alt={SITE.title} />
            </a>
          </div>
        </div>

        <nav className="site-head-menu" aria-label="Main navigation">
          {SITE.navigation.length > 0 && (
            <ul className="nav m-0 flex list-none items-center gap-[var(--head-nav-gap,2.8rem)] p-0">
              {SITE.navigation.map((item) => (
                <li key={item.url}>
                  <a className={navLinkClass} href={item.url}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="site-head-actions"></div>
      </div>
    </header>
  );
}
