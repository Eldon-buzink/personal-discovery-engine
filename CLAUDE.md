# Bearing

## Design rules

**Type tokens** (`app/globals.css`, Tailwind theme, `lib/design/type.ts`). Use these, not raw sizes:

- **display**: Newsreader regular, for headings. Four sizes (`display1` to `display4`).
- **trait-word**: Newsreader italic 600, only for the user's own trait word (blob labels, the pattern name). The blob label is 30px.
- **body**: sans 16px, line-height 1.6.
- **ui**: sans 14px medium, sentence case (buttons, chips, labels).
- **meta**: sans 13px in the muted grey, `#8C8A83` (`text-muted`). Colour tokens stay as they are on main.

**Italic only for trait words.** No other italics: no italic headline tails, quotes, one-liners or notes.

**No eyebrows without information.** Remove a small label when the heading after it already says the same thing. When one is kept (a date range, a section name the heading lacks), it uses the meta token in sentence case: no uppercase, no letter-spacing.

**Motion**: one easing curve, `cubic-bezier(0.22, 1, 0.36, 1)`, and two durations, 200ms for UI changes and 600ms for entrances (`--ease`, `--dur-ui`, `--dur-enter`; `lib/design/motion.ts`). Entrances play once when they come into view, then rest (`useEnterOnce`). Respect `prefers-reduced-motion` everywhere: instant state, no movement. Only blobs keep drifting, on the shared clock (`registerBlobTask` in `lib/blobs.ts`); never add a second animation loop.

**No scroll-linked animation on the landing page**: no pinned elements, no scroll-scrubbed transitions, no parallax.

**Copy**: plain words, about a 12-year-old reading level. No em dashes. No "it's not X, it's Y" constructions. No clinical or academic terms.
