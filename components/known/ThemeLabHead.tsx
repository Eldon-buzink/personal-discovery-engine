// Dev-only theme lab. app/layout.tsx renders this (a server component) ONLY
// when NEXT_PUBLIC_THEME_LAB=1, so in production none of it reaches the
// browser: no script, no CSS, no extra font.
//
//   ?sans=inter (default) | instrument | geist
//
// The inline script runs in <head>, before the page paints, and only sets
// data attributes on <html>; the CSS below switches tokens on them. The lab
// fonts come from Google Fonts with display=swap, in the weights the sans
// tokens use (400 body and meta, 500 ui, 600 the few semibold labels).

const LAB_CSS = `
html[data-sans="instrument"] { --font-body: 'Instrument Sans', system-ui, sans-serif; }
html[data-sans="geist"] { --font-body: 'Geist', system-ui, sans-serif; }
`

const LAB_JS = `(function () {
  try {
    var p = new URLSearchParams(location.search), r = document.documentElement;
    var sans = p.get('sans');
    if (sans === 'inter' || sans === 'instrument' || sans === 'geist') r.dataset.sans = sans;
  } catch (e) {}
})();`

export default function ThemeLabHead() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Geist:wght@400;500;600&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: LAB_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: LAB_JS }} />
    </>
  )
}
