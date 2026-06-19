/**
 * Date + reading-time helpers.
 *
 * Dates are formatted in the site timezone (Asia/Jerusalem) via Intl
 * (e.g. a post published 2020-07-07T15:10:52Z shows "07 Jul 2020").
 */
import { SITE } from '../config';

const TZ = SITE.timezone; // 'Asia/Jerusalem'

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Extract Y/M/D (in the site timezone) from a Date. */
function ymd(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat(SITE.locale, {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Feed/card date — "MMM D, YYYY" (e.g. "Jun 6, 2026"). */
export function formatFeedDate(date: Date): string {
  const { year, month, day } = ymd(date);
  return `${MONTHS_SHORT[month - 1]} ${day}, ${year}`;
}

/** Single-post display date — "DD MMM YYYY" (e.g. "07 Jul 2020"). */
export function formatPostDate(date: Date): string {
  const { year, month, day } = ymd(date);
  return `${String(day).padStart(2, '0')} ${MONTHS_SHORT[month - 1]} ${year}`;
}

/** <time datetime> value — "YYYY-MM-DD" in the site timezone. */
export function dateAttr(date: Date): string {
  const { year, month, day } = ymd(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Reading time in whole minutes.
 *
 * Algorithm:
 *   • words counted on the text content (code block CONTENT included;
 *     only the ``` fences are stripped), at 275 wpm
 *   • image time ramps: 1st image +12s, 2nd +11s … 10th +3s, then +3s each
 *   • total = round((words / 275 * 60 + imageSeconds) / 60), minimum 1
 */
export function readingTimeMinutes(markdown: string): number {
  const text = markdown
    .replace(/```[^\n]*\n/g, ' ') // opening fence line (with optional language)
    .replace(/```/g, ' ') // closing fences — keep the code text between them
    .replace(/<[^>]+>/g, ' ') // strip HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // Markdown images counted separately below
    .replace(/[#>*_`~]+/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;

  // Images: HTML <img …> and Markdown ![alt](src).
  const images = (markdown.match(/<img|!\[[^\]]*\]\(/g) ?? []).length;
  let imageSeconds = 0;
  for (let i = 0; i < images && i < 10; i++) imageSeconds += 12 - i; // 12,11,…,3
  if (images > 10) imageSeconds += (images - 10) * 3;

  const seconds = (words / 275) * 60 + imageSeconds;
  return Math.max(1, Math.round(seconds / 60));
}
