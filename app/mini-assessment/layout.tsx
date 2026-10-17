import type { Metadata } from 'next'

// The quiz and result pages are client components, so they can't export
// metadata themselves. Kept out of search with a noindex meta tag, not a
// robots.txt block: a blocked page can't be crawled, so Google would never
// see the noindex and could still index the bare URL.
export const metadata: Metadata = {
  title: 'Quick check — Bearing',
  robots: { index: false, follow: false },
}

export default function MiniAssessmentLayout({ children }: { children: React.ReactNode }) {
  return children
}
