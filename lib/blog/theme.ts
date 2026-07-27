// The 8 curated hues from reference/known-blog-index-mockup-v5.html's :root,
// keyed by name so frontmatter can write `accentColor: coral` instead of a
// raw hue number. Same 8 hues (same numbers) as lib/blobs.ts's CURATED_HUES —
// not importing from there directly since that module is React/DOM-oriented
// (client-only blob rendering) and this needs to be usable from server
// components and plain data mapping without pulling that in.
export const BLOG_ACCENT_HUES: Record<string, number> = {
  coral: 8,
  amber: 35,
  moss: 145,
  teal: 175,
  sky: 205,
  periwinkle: 235,
  plum: 290,
  rose: 335,
}

export function accentHue(name: string): number {
  return BLOG_ACCENT_HUES[name] ?? 8
}

// Mirrors the mockup's --coral/--amber/etc custom properties (hsl(hue,sat%,light%)).
// Saturation/lightness pinned per the mockup's :root values — they aren't
// uniform across hues (e.g. moss is 30% sat, coral is 72%), so this is a
// lookup, not a formula.
const ACCENT_HSL: Record<string, { s: number; l: number }> = {
  coral: { s: 72, l: 58 },
  amber: { s: 75, l: 55 },
  moss: { s: 30, l: 45 },
  teal: { s: 35, l: 42 },
  sky: { s: 55, l: 55 },
  periwinkle: { s: 45, l: 65 },
  plum: { s: 30, l: 50 },
  rose: { s: 55, l: 62 },
}

export function accentColorCss(name: string): string {
  const hue = accentHue(name)
  const { s, l } = ACCENT_HSL[name] ?? { s: 60, l: 55 }
  return `hsl(${hue},${s}%,${l}%)`
}

export function accentColorSoftCss(name: string, opacity = 0.9): string {
  const hue = accentHue(name)
  const { s, l } = ACCENT_HSL[name] ?? { s: 60, l: 55 }
  return `hsla(${hue},${s}%,${l}%,${opacity})`
}
