// Dev-only theme lab. app/layout.tsx renders this (a server component) ONLY
// when NEXT_PUBLIC_THEME_LAB=1, so in production none of it reaches the
// browser: no script, no CSS, no extra font.
//
//   ?sans=inter (default) | instrument
//   ?bg=a (default) | b | c | d
//
// The inline script runs in <head>, before the page paints, and only sets
// data attributes on <html>; the CSS below switches tokens on them.

const LAB_CSS = `
html[data-sans="instrument"] { --font-body: 'Instrument Sans', system-ui, sans-serif; }
/* B: a slightly greyer, less yellow off-white. */
html[data-bg="b"] { --color-bg: #F4F3F0; }
/* C: current cream; coral only for the selected / active state. */
html[data-bg="c"] { --accent-flag: #262420; --accent-flag-soft: #FFFFFF; }
/* D: report only. A very faint tint of the selected trait's blob hue
   (--tint-hue is set on the report's root); 6% keeps meta text above 4.5:1. */
html[data-bg="d"] .tint-root {
  background: color-mix(in srgb, hsl(var(--tint-hue, 8) 70% 60%) 6%, var(--color-bg)) !important;
  transition: background-color 600ms cubic-bezier(0.22, 1, 0.36, 1);
}
`

const LAB_JS = `(function () {
  try {
    var p = new URLSearchParams(location.search), r = document.documentElement;
    var sans = p.get('sans'), bg = p.get('bg');
    if (sans === 'inter' || sans === 'instrument') r.dataset.sans = sans;
    if (bg === 'a' || bg === 'b' || bg === 'c' || bg === 'd') r.dataset.bg = bg;
  } catch (e) {}
})();`

export default function ThemeLabHead() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: LAB_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: LAB_JS }} />
    </>
  )
}
