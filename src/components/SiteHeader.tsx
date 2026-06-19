/**
 * SiteHeader.tsx — the `#gh-head` header, rendered on every page except home
 * (which uses the Cover component instead).
 *
 * Navigation menus are empty (SITE.navigation = []) so only the logo shows.
 * The empty <nav class="gh-head-menu"> and <div class="gh-head-actions"> are
 * kept because the CSS grid layout depends on them being present. Site search
 * is not implemented.
 *
 * The grid layout lives in @layer components (.gh-head*) — it's a named
 * responsive grid that can't be expressed cleanly as inline utilities.
 */
import { SITE } from '../config';

export default function SiteHeader() {
  return (
    <header id="gh-head" className="gh-head gh-outer">
      <div className="gh-head-inner gh-inner">
        <div className="gh-head-brand">
          <div className="gh-head-brand-wrapper">
            <a className="gh-head-logo" href="/">
              {/* Single logo image. */}
              <img src={SITE.logo} alt={SITE.title} />
            </a>
          </div>
        </div>

        <nav className="gh-head-menu"></nav>

        <div className="gh-head-actions"></div>
      </div>
    </header>
  );
}
