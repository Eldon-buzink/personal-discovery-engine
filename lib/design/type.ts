/**
 * lib/design/type.ts
 *
 * The type tokens as inline-style objects, for the many components that
 * style inline instead of with Tailwind classes. Values all come from the
 * CSS variables in app/globals.css, so one change there updates both.
 *
 * - display: Newsreader regular, headings. Four sizes.
 * - traitWord: Newsreader italic 600, ONLY for the user's own trait word
 *   (blob labels, the pattern name). The only italic allowed.
 * - body: sans 16px / 1.6.
 * - ui: sans 14px medium, sentence case (buttons, chips, labels).
 * - meta: sans 13px in the one meta grey.
 */

import type { CSSProperties } from 'react'

const display = (size: string, lineHeight: number, letterSpacing?: string): CSSProperties => ({
  fontFamily: 'var(--font-display)',
  fontWeight: 400,
  fontStyle: 'normal',
  fontSize: size,
  lineHeight,
  ...(letterSpacing ? { letterSpacing } : {}),
})

export const type = {
  display1: display('var(--text-display-1)', 1.12, '-0.02em'),
  display2: display('var(--text-display-2)', 1.2, '-0.01em'),
  display3: display('var(--text-display-3)', 1.3),
  display4: display('var(--text-display-4)', 1.35),
  // Size is set by the caller where a blob dictates it; the default is the
  // locked blob-label size (30px).
  traitWord: {
    fontFamily: 'var(--font-trait)',
    fontStyle: 'italic',
    fontWeight: 600,
    fontSize: 'var(--text-trait-word)',
    lineHeight: 1.2,
  } as CSSProperties,
  body: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-body)',
    lineHeight: 'var(--leading-body)',
    fontWeight: 400,
    fontStyle: 'normal',
  } as CSSProperties,
  ui: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-ui)',
    lineHeight: 1.4,
    fontWeight: 500,
    fontStyle: 'normal',
    textTransform: 'none',
    letterSpacing: 'normal',
  } as CSSProperties,
  meta: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-meta)',
    lineHeight: 1.5,
    fontWeight: 400,
    fontStyle: 'normal',
    color: '#8C8A83',
    textTransform: 'none',
    letterSpacing: 'normal',
  } as CSSProperties,
}

// The palette as it is on main (tailwind.config.ts colors); not tokens of
// their own, so nothing here can drift from it.
export const color = {
  bg: '#F7F4ED',
  ink: '#262420',
  body: '#56534D',
  meta: '#8C8A83',
  accent: '#D85A30',
}

// The same tokens as CSS declarations, for components that style through a
// CSS string (the landing page's landingCSS, sectionStyles.ts).
export const css = {
  display: 'font-family:var(--font-display);font-weight:400;font-style:normal;',
  display1: 'font-family:var(--font-display);font-weight:400;font-style:normal;font-size:var(--text-display-1);line-height:1.12;letter-spacing:-0.02em;',
  display2: 'font-family:var(--font-display);font-weight:400;font-style:normal;font-size:var(--text-display-2);line-height:1.2;letter-spacing:-0.01em;',
  display3: 'font-family:var(--font-display);font-weight:400;font-style:normal;font-size:var(--text-display-3);line-height:1.3;',
  display4: 'font-family:var(--font-display);font-weight:400;font-style:normal;font-size:var(--text-display-4);line-height:1.35;',
  traitWord: 'font-family:var(--font-trait);font-style:italic;font-weight:600;',
  body: 'font-family:var(--font-body);font-size:var(--text-body);line-height:var(--leading-body);font-weight:400;font-style:normal;',
  ui: 'font-family:var(--font-body);font-size:var(--text-ui);line-height:1.4;font-weight:500;font-style:normal;text-transform:none;letter-spacing:normal;',
  meta: 'font-family:var(--font-body);font-size:var(--text-meta);line-height:1.5;font-weight:400;font-style:normal;color:#8C8A83;text-transform:none;letter-spacing:normal;',
}
