import type { Metadata } from 'next'
import LinkErrorClient from './LinkErrorClient'

// Where /auth/confirm and /auth/callback send a sign-in link that couldn't
// sign the person in: usually expired (links last 24 hours) or already
// used. The page offers a fresh link straight away.
export const metadata: Metadata = {
  title: 'This link has expired — Bearing',
  robots: { index: false, follow: false },
}

export default function LinkErrorPage() {
  return <LinkErrorClient />
}
