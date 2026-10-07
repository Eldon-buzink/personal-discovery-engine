import Link from 'next/link'
import type { Metadata } from 'next'

// Where /auth/callback sends a sign-in link that couldn't sign the user in.
// The usual cause for ad traffic: the visitor started in an in-app browser
// (Instagram, Pinterest), and their email app opened the link in a different
// browser. The fix is the 6-digit code from the same email, typed back where
// they started.
export const metadata: Metadata = {
  title: 'Sign-in link didn’t work — Bearing',
  robots: { index: false, follow: false },
}

export default function LinkErrorPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="font-serif font-medium text-charcoal" style={{ fontSize: 24, lineHeight: 1.3, marginBottom: 14 }}>
          This link didn&apos;t sign you in
        </p>
        <p className="font-sans text-charcoal-soft" style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 12 }}>
          Sign-in links only work in the browser you started in, and they expire after a while.
        </p>
        <p className="font-sans text-charcoal-soft" style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 28 }}>
          If you started inside another app, like Instagram or Pinterest, go back there and type the
          6-digit code from the same email. Your progress is waiting in that browser.
        </p>
        <Link
          href="/"
          className="font-sans font-medium"
          style={{ display: 'inline-block', padding: '13px 24px', borderRadius: 999, background: '#262420', color: '#F7F4ED', fontSize: 14 }}
        >
          Go to Bearing
        </Link>
      </div>
    </div>
  )
}
