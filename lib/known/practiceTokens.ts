/**
 * lib/known/practiceTokens.ts
 *
 * The directional/active accent from the actual mockup (see
 * reference/01-master-handover.md's linked artifact, Practice.dc.html et
 * al.) — not in tailwind.config.ts, since it's specific to the practice
 * system's directional treatment, not a site-wide color. Kept as one shared
 * source so every directional badge/banner across the practice screens (and
 * the mini-assessment result screen, which predates this file and used an
 * ad-hoc hsl() approximation) matches the mockup exactly.
 */
// Token-driven (app/globals.css) so the theme lab can demote the flag jobs.
export const directionalAccent = 'var(--accent-flag)'
export const directionalSoft = 'var(--accent-flag-soft)'
// The selected / active state (a chosen check-in answer, an "on" toggle).
export const selectedAccent = 'var(--accent)'
export const selectedSoft = 'var(--accent-soft)'
