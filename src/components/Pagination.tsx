/**
 * Pagination.tsx — the feed pager.
 *
 * Renders a "Load more" link to the next page when one exists; omitted when
 * there is no next page. A plain <a> — no JavaScript required.
 *
 * Styled with Tailwind utilities bound to the @theme tokens. The resting
 * color is the secondary-button color (darker-gray) and the hover state
 * flips border + text to the brand accent, matching the live button.
 */
interface Props {
  /** Absolute or root-relative URL of the next page, if any. */
  nextUrl?: string;
}

export default function Pagination({ nextUrl }: Props) {
  if (!nextUrl) return null;
  return (
    <nav className="load-more mt-[48px] flex justify-center">
      <a
        href={nextUrl}
        className="button button-secondary gh-loadmore inline-flex h-[36px] cursor-pointer items-center justify-center rounded-[3px] border border-light-gray bg-bg px-[15px] text-[11px] font-extrabold uppercase tracking-[.5px] text-darker-gray transition-colors hover:border-brand hover:text-brand hover:opacity-100"
      >
        Load more
      </a>
    </nav>
  );
}
