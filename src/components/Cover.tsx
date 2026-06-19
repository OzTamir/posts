/**
 * Cover.tsx — the home-page hero.
 * Renders the site icon + the site description inside a <code> element
 * (the description is "# cat /dev/brain >> posts").
 *
 * Styling is expressed as Tailwind utilities bound to the @theme tokens
 * (the 1rem = 10px scale means [1.7rem] = the live --cover font size).
 */
import { SITE } from '../config';

export default function Cover() {
  return (
    <div className="cover gh-outer mt-[48px]">
      <div className="cover-content mx-auto flex max-w-[520px] flex-col items-center text-center">
        {SITE.icon && (
          <div className="cover-icon relative mb-[32px]">
            <img className="cover-icon-image w-[120px]" src={SITE.icon} alt={SITE.title} />
          </div>
        )}

        {SITE.description && (
          <div className="cover-description text-[1.7rem]">
            <code>{SITE.description}</code>
          </div>
        )}
      </div>
    </div>
  );
}
