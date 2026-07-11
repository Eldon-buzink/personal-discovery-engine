// ⚠ STUB — Legal copy not yet provided. Do not generate legal copy.

const cream    = '#F5F2EB'
const charcoal = '#1C1C1A'
const c40      = 'rgba(28,28,26,0.4)'
const c80      = 'rgba(28,28,26,0.8)'
const sans     = 'var(--font-inter), system-ui, sans-serif'
const serif    = 'var(--font-newsreader), Georgia, serif'

export default function PrivacyPage() {
  return (
    <div style={{ background: cream, color: charcoal, fontFamily: sans, minHeight: '100vh' }}>
      <section style={{ padding: '140px 48px 120px', maxWidth: 560, margin: '0 auto' }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: c40, marginBottom: 20 }}>
          Privacy Policy
        </p>
        <h1 style={{ fontFamily: serif, fontSize: 42, fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.15, color: charcoal, marginBottom: 24 }}>
          Privacy.
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: c80, fontWeight: 300 }}>
          Privacy policy content coming soon. This page is a placeholder — provide your legal copy to fill it in.
        </p>
      </section>
    </div>
  )
}
