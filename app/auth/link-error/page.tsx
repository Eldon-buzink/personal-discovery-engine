import type { Metadata } from 'next'
import LinkErrorClient from './LinkErrorClient'
import type { LinkErrorReason } from '@/lib/auth/linkError'

// Where /auth/confirm and /auth/callback send a sign-in link that couldn't
// sign the person in, with ?reason= (lib/auth/linkError.ts) so the page can
// say what happened. It offers a fresh link straight away.
export const metadata: Metadata = {
  title: 'This link didn’t work — Bearing',
  robots: { index: false, follow: false },
}

const REASONS: LinkErrorReason[] = ['expired', 'browser', 'invalid']

export default function LinkErrorPage({ searchParams }: { searchParams: { reason?: string } }) {
  const reason = REASONS.includes(searchParams.reason as LinkErrorReason) ? (searchParams.reason as LinkErrorReason) : 'invalid'
  return <LinkErrorClient reason={reason} />
}
