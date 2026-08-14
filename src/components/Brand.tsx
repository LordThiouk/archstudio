/* The ArchStudio mark and wordmark.
 *
 * The mark is the smallest sentence the product knows how to say: two
 * components and a dependency. The filled disc is the service that calls, the
 * open circle the one that answers — the same reading the canvas uses for the
 * ends of every edge it draws.
 *
 * Geometry, from the construction sheet: a 2:1 box, nodes a quarter of the
 * width, the rule a twelfth of a node's diameter, and at least one node
 * diameter of air around the whole thing. Colours come from CSS (`.mark` in
 * globals.css) so the inverted lockup is a class, not a second drawing.
 *
 * Anything that renders outside the app — the exported viewer, the favicon —
 * cannot import this file, so it carries its own copy of these three shapes.
 * The numbers below are the source. */

export const MARK_VIEWBOX = '0 0 192 96';

/** The mark alone. `size` is the width; the box is 2:1, so height follows. */
export function Mark({ size = 24, className, inverted }: {
  size?: number; className?: string; inverted?: boolean;
}) {
  return (
    <svg
      className={['mark', inverted ? 'inverted' : '', className].filter(Boolean).join(' ')}
      viewBox={MARK_VIEWBOX} width={size} height={size / 2} aria-hidden="true"
    >
      <path className="mk-line" d="M8 48H184" strokeWidth="4" />
      <circle className="mk-caller" cx="24" cy="48" r="24" />
      <circle className="mk-callee" cx="170" cy="48" r="20" strokeWidth="4" />
    </svg>
  );
}

/** `Arch` in the heavy weight, `Studio` in the light one — one word, two voices. */
export function Wordmark({ className }: { className?: string }) {
  return <b className={className}>Arch<i>Studio</i></b>;
}

/** Mark and wordmark side by side: the default lockup. */
export function Lockup({ size = 26, sub }: { size?: number; sub?: string }) {
  return (
    <>
      <Mark size={size} />
      <div className="wordmark">
        <Wordmark />
        {sub && <span>{sub}</span>}
      </div>
    </>
  );
}
