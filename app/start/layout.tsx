import Link from 'next/link'
import SiteFooter from '@/components/known/SiteFooter'

// Ad-traffic landing pages: wordmark-only header (no site nav), so the
// quick check stays the main way forward; the site footer sits below the
// page like on every other marketing page.
export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="px-6 pt-6 flex justify-center">
        <Link href="/" className="text-charcoal" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em' }}>
          Bearing
        </Link>
      </header>
      {children}
      <SiteFooter />
    </div>
  )
}
