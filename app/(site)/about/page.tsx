// ⚠ STUB — About page content not yet provided.
// The user flagged this should not have invented company narrative copy.
// Add real copy once provided.

import { buildMetadata } from '@/lib/seo'

// Deliberately minimal — the page itself has no real narrative yet (see stub
// note above), so the description just states what the page is rather than
// inventing company story to fill it out. Revisit once real About copy exists.
export const metadata = buildMetadata({
  path: '/about',
  title: 'About — Bearing',
  description: 'About Bearing.',
})

const cream    = '#F5F2EB'
const charcoal = '#1C1C1A'
const c40      = 'rgba(28,28,26,0.4)'
const c80      = 'rgba(28,28,26,0.8)'
const sans     = 'var(--font-inter), system-ui, sans-serif'
const serif    = 'var(--font-newsreader), Georgia, serif'

export default function AboutPage() {
  return (
    <div style={{ background: cream, color: charcoal, fontFamily: sans, minHeight: '100vh' }}>
      <section style={{ padding: '140px 48px 120px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: c40, marginBottom: 20 }}>
          About
        </p>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.15, color: charcoal, marginBottom: 24 }}>
          This is a stub.<br /><em>Copy coming soon.</em>
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: c80, fontWeight: 300, maxWidth: 400, margin: '0 auto' }}>
          The About page is ready for content. Provide the company narrative and this gets filled in.
        </p>
      </section>
    </div>
  )
}
