import Link from 'next/link'
import { REVIEW_CADENCES, REVIEW_COPY, type ReviewCadence } from '@/lib/known/reviewProgress'

// Top of each review page: the three cadences as plain text links (the
// current one set apart), then the page's own heading. Typographic, like
// every other practice screen — no tab bar.
export default function ReviewHeader({ cadence, title, dateRange }: { cadence: ReviewCadence; title: string; dateRange?: string | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <nav aria-label="Reviews" className="flex" style={{ gap: 16, marginBottom: 14 }}>
        {REVIEW_CADENCES.map((c) => (
          <Link
            key={c}
            href={REVIEW_COPY[c].href}
            aria-current={c === cadence ? 'page' : undefined}
            className="font-sans"
            style={{
              fontSize: 13,
              color: c === cadence ? '#262420' : '#8a8375',
              fontWeight: c === cadence ? 500 : 400,
              textDecoration: c === cadence ? 'none' : 'underline',
            }}
          >
            {REVIEW_COPY[c].title}
          </Link>
        ))}
      </nav>
      <p className="font-sans font-semibold uppercase text-muted" style={{ fontSize: 13, letterSpacing: '0.04em' }}>
        {REVIEW_COPY[cadence].title} review
      </p>
      <h1 className="font-serif font-medium text-charcoal" style={{ fontSize: 25, lineHeight: 1.3 }}>
        {title}
      </h1>
      {dateRange && (
        <p className="font-sans text-muted" style={{ fontSize: 13 }}>
          {dateRange}
        </p>
      )}
    </div>
  )
}
