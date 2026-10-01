import Link from 'next/link'

// Deliberately minimal chrome for ad-traffic landing pages: wordmark only,
// no site nav or footer, so the single CTA is the only way forward.
export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="px-6 pt-6 flex justify-center">
        <Link href="/" className="font-serif text-charcoal" style={{ fontSize: 20, fontWeight: 500 }}>
          Bearing
        </Link>
      </header>
      {children}
    </div>
  )
}
