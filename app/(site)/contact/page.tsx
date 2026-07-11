// No form pattern exists in the codebase — contact is a mailto CTA per spec.
// Add a proper form here once a form pattern is established.

import Link from 'next/link'

const cream    = '#F5F2EB'
const charcoal = '#1C1C1A'
const c40      = 'rgba(28,28,26,0.4)'
const c80      = 'rgba(28,28,26,0.8)'
const sans     = 'var(--font-inter), system-ui, sans-serif'
const serif    = 'var(--font-newsreader), Georgia, serif'

export default function ContactPage() {
  return (
    <div style={{ background: cream, color: charcoal, fontFamily: sans, minHeight: '100vh' }}>
      <section style={{ padding: '140px 48px 120px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: c40, marginBottom: 20 }}>
          Contact
        </p>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.15, color: charcoal, marginBottom: 24 }}>
          Get in touch.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: c80, fontWeight: 300, maxWidth: 400, margin: '0 auto 40px' }}>
          Questions, feedback, or something else — we read everything and respond to most things.
        </p>
        <Link
          href="mailto:hello@known.so"
          style={{
            display: 'inline-block',
            background: charcoal, color: cream,
            textDecoration: 'none', borderRadius: 100,
            padding: '14px 32px',
            fontFamily: sans, fontSize: 15, fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          hello@known.so
        </Link>
        <p style={{ fontSize: 12, color: c40, marginTop: 16 }}>
          We typically respond within a day or two.
        </p>
      </section>
    </div>
  )
}
