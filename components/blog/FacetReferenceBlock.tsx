import { getFacetReference, isDescribedPublicly } from '@/lib/known/facetReference'
import { blogCard, blogCharcoal, blogCharcoalSoft, blogLine, blogSans, blogSerif } from './tokens'

// Trait posts only: the facet's items, score ranges, trait words and daily
// check-in, read from lib/known/facetReference.ts (the same source files the
// report uses). Server-rendered, plain semantic HTML.
export default function FacetReferenceBlock({ facetId, accent }: { facetId: string; accent: string }) {
  const ref = getFacetReference(facetId)
  // Facets withheld from public pages (FACETS_NOT_DESCRIBED_PUBLICLY) show nothing.
  if (!ref || !isDescribedPublicly(facetId)) return null
  const { label, domain, items, traitWords, thresholds, checkIn } = ref
  const headingId = `facet-reference-${facetId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  const small = { fontSize: 14.5, color: blogCharcoalSoft, lineHeight: 1.6, fontFamily: blogSans }
  const subheading = { fontWeight: 600, fontSize: 15.5, color: blogCharcoal, fontFamily: blogSans, margin: '24px 0 10px' }
  const cell = { padding: '8px 12px 8px 0', borderTop: `1px solid ${blogLine}`, textAlign: 'left' as const, verticalAlign: 'top' as const }

  return (
    <section
      aria-labelledby={headingId}
      style={{ background: blogCard, border: `1px solid ${blogLine}`, borderRadius: 16, padding: '26px 28px', margin: '40px 0 30px' }}
    >
      <h2 id={headingId} style={{ fontFamily: blogSerif, fontWeight: 500, fontSize: 22, margin: '0 0 6px', color: blogCharcoal }}>
        How Bearing measures {label}
      </h2>
      <p style={{ ...small, margin: 0 }}>
        One of six {domain} facets. Four statements, each rated from 1 (very inaccurate) to 5 (very accurate).
      </p>

      <h3 style={subheading}>The four statements</h3>
      <ol style={{ ...small, margin: 0, paddingLeft: 20 }}>
        {items.map((item) => (
          <li key={item.id} style={{ marginBottom: 4 }}>
            &ldquo;{item.text}&rdquo;
            {item.reverseScored && <span style={{ color: accent }}> (reverse-scored)</span>}
          </li>
        ))}
      </ol>

      <h3 style={subheading}>How the score is read</h3>
      <p style={{ ...small, margin: '0 0 8px' }}>
        The facet score is the average of the four answers, with reverse-scored statements flipped first.
      </p>
      <table style={{ ...small, borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th scope="col" style={{ ...cell, borderTop: 'none', fontWeight: 600, color: blogCharcoal }}>Score</th>
            <th scope="col" style={{ ...cell, borderTop: 'none', fontWeight: 600, color: blogCharcoal }}>Reads as</th>
            <th scope="col" style={{ ...cell, borderTop: 'none', fontWeight: 600, color: blogCharcoal }}>Trait word</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={cell}>Below {thresholds.mid}</td><td style={cell}>Low</td><td style={cell}>{traitWords.low}</td></tr>
          <tr><td style={cell}>{thresholds.mid} to below {thresholds.high}</td><td style={cell}>Mid</td><td style={cell}>{traitWords.mid}</td></tr>
          <tr><td style={cell}>{thresholds.high} and above</td><td style={cell}>High</td><td style={cell}>{traitWords.high}</td></tr>
        </tbody>
      </table>

      <h3 style={subheading}>The daily check-in</h3>
      <p style={{ ...small, margin: '0 0 8px' }}>{checkIn.question}</p>
      <ul style={{ ...small, margin: 0, paddingLeft: 20 }}>
        {checkIn.options.map((o) => (
          <li key={o.id} style={{ marginBottom: 4 }}>{o.label}</li>
        ))}
      </ul>
    </section>
  )
}
