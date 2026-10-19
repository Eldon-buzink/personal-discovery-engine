import type { Metadata } from 'next'

// The page itself is a client component (auth state), so its metadata
// lives here. Personal page: never indexed.
export const metadata: Metadata = {
  title: 'Your account — Bearing',
  robots: { index: false, follow: false },
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children
}
