// Design tokens transcribed directly from both mockups' :root blocks
// (reference/known-blog-index-mockup-v5.html and known-blog-post-mockup-v5.html)
// — pixel-exact values, not the app's existing landing-page tokens, same
// precedent as the landing page rebuild: these two mockups are their own
// consistent design system, close to but not identical to values used
// elsewhere in the app (e.g. blog's charcoal-soft #5A5750 vs the landing
// page's #57534A). Scoped to components/blog/ only.
export const blogCream = '#F7F4ED'
export const blogCharcoal = '#262420'
export const blogCharcoalSoft = '#5A5750'
export const blogLine = '#E4DFD3'
export const blogCard = '#FFFEFB'
// Post hero-card background only — a hair lighter than blogCard, per the
// post mockup's .hero-card rule specifically (not used anywhere else).
export const blogHeroCardBg = '#FBF8F1'
// glow-cta's dark background — a distinct value from blogCharcoal (hsl(30,10%,24%)
// vs charcoal's hsl(24,7%,14%)-ish #262420), per the post mockup's --card-dark.
// Not a typo/approximation of charcoal; the mockup genuinely uses two different
// darks for different dark surfaces.
export const blogCardDark = 'hsl(30,10%,24%)'

export const blogSans = "'Inter', var(--font-inter), sans-serif"
export const blogSerif = "'Newsreader', var(--font-newsreader), serif"

// The 8 curated accent hues, as CSS custom-property-equivalent strings —
// same hue numbers as lib/blog/theme.ts's BLOG_ACCENT_HUES (kept in sync
// manually since one is a simple color-token file and the other computes
// hsl()/hsla() strings from name + opacity for dynamic accentColor values).
export const blogCoral = 'hsl(8,72%,58%)'
export const blogCoralSoft = 'hsl(8,72%,93%)'
export const blogAmber = 'hsl(35,75%,55%)'
export const blogMoss = 'hsl(145,30%,45%)'
export const blogTeal = 'hsl(175,35%,42%)'
export const blogSky = 'hsl(205,55%,55%)'
export const blogPeriwinkle = 'hsl(235,45%,65%)'
export const blogPlum = 'hsl(290,30%,50%)'
export const blogRose = 'hsl(335,55%,62%)'
