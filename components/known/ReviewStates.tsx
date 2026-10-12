import Link from 'next/link'

// Shared bits of the three review pages.

export function ReviewLoading({ failed }: { failed: boolean }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="font-sans text-sm text-muted">{failed ? 'Something went wrong — try again in a moment.' : 'Loading…'}</p>
    </div>
  )
}

export function NoActiveTraits() {
  return (
    <div style={{ padding: '22px 18px', borderRadius: 14, border: '1px dashed #DAD3C3', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p className="font-serif text-charcoal-soft" style={{ fontSize: 16 }}>Nothing active right now</p>
      <Link href="/practice" className="font-sans text-muted" style={{ fontSize: 13, textDecoration: 'underline' }}>
        Pick a trait in your practice
      </Link>
    </div>
  )
}

export function ReviewFooter() {
  return (
    <>
      <p className="font-serif text-charcoal-soft" style={{ fontStyle: 'italic', fontSize: 14, textAlign: 'center', paddingTop: 4 }}>
        No score. No verdict. Just what you noticed.
      </p>
      <Link href="/practice" className="font-sans text-muted" style={{ display: 'block', textAlign: 'center', padding: 8, fontSize: 13 }}>
        Back to your practice
      </Link>
    </>
  )
}
