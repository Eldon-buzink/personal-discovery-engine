const cream    = '#F5F2EB'
const charcoal = '#1C1C1A'
const c40      = 'rgba(28,28,26,0.4)'
const c80      = 'rgba(28,28,26,0.8)'
const sans     = 'var(--font-inter), system-ui, sans-serif'
const serif    = 'var(--font-newsreader), Georgia, serif'

export default function BlogPage() {
  return (
    <div style={{ background: cream, color: charcoal, fontFamily: sans, minHeight: '100vh' }}>
      <section style={{ padding: '140px 48px 120px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: c40, marginBottom: 20 }}>
          Blog
        </p>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.15, color: charcoal, marginBottom: 24 }}>
          New writing<br /><em>is coming.</em>
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: c80, fontWeight: 300, maxWidth: 440, margin: '0 auto' }}>
          We&apos;re thinking carefully about what&apos;s worth putting into words. When we have something that earns the space, it&apos;ll be here.
        </p>
      </section>
    </div>
  )
}
