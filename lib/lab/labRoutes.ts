// Report lab and options boards: only reachable on a developer's machine.
// - `next dev` (NODE_ENV=development): on.
// - A local production build (`next start`, NODE_ENV=production): on only
//   with LAB_ROUTES=1 set, so a lab can be served from a real build.
// - Any Vercel deployment (VERCEL=1), preview or production: always off,
//   whatever else is set.
// Off means the route renders Next's 404 (notFound()).

export function labRoutesEnabled(): boolean {
  if (process.env.VERCEL === '1') return false
  if (process.env.NODE_ENV === 'development') return true
  return process.env.LAB_ROUTES === '1'
}
