'use client'

// Converted from reference/known-pricing_1.html — copy and layout preserved exactly.
// ⚠ Unlock CTA: no checkout route exists yet. Wire href once Stripe/checkout is set up.

import Link from 'next/link'

const cream        = '#F7F4ED'
const charcoal     = '#262420'
const charcoalSoft = '#56534D'
const gray         = '#8C8A83'
const line         = '#E5E1D5'
const white        = '#FDFCF9'
const teal         = '#3D6B5C'
const sans         = 'var(--font-inter), system-ui, sans-serif'
const serif        = 'var(--font-newsreader), Georgia, serif'

const pricingCSS = `
  .pr-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .pr-cta:hover { opacity: 0.85; }
  @media (max-width: 720px) {
    .pr-cards { grid-template-columns: 1fr; }
  }
`

// ── Free card blob: SMIL-animated teal path (matches reference exactly) ────────
function FreeBlob() {
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%">
      <defs>
        <filter id="pr-blur1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <path fill="hsl(175,38%,42%)" filter="url(#pr-blur1)" opacity="0.85">
        <animate
          attributeName="d" dur="7s" repeatCount="indefinite"
          values="
            M100,25 C130,25 150,50 148,75 C146,100 120,112 98,110 C76,108 52,98 50,72 C48,48 70,25 100,25 Z;
            M100,22 C135,28 152,48 145,78 C140,102 115,110 95,108 C72,106 50,92 52,68 C54,46 68,20 100,22 Z;
            M100,25 C130,25 150,50 148,75 C146,100 120,112 98,110 C76,108 52,98 50,72 C48,48 70,25 100,25 Z"
        />
      </path>
    </svg>
  )
}

// ── Paid card blob: orbiting circles (matches reference exactly) ───────────────
function PaidBlob() {
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%">
      <defs>
        <filter id="pr-blur2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <g filter="url(#pr-blur2)">
        <circle cx="100" cy="80" r="18" fill="hsl(175,38%,55%)" opacity="0.9">
          <animate attributeName="r" values="18;20;18" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="62" cy="60" r="10" fill="hsl(8,65%,62%)" opacity="0.85">
          <animateTransform attributeName="transform" type="rotate" from="0 100 80" to="360 100 80" dur="16s" repeatCount="indefinite" />
        </circle>
        <circle cx="145" cy="58" r="8" fill="hsl(35,65%,60%)" opacity="0.85">
          <animateTransform attributeName="transform" type="rotate" from="90 100 80" to="450 100 80" dur="20s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="102" r="9" fill="hsl(290,40%,65%)" opacity="0.85">
          <animateTransform attributeName="transform" type="rotate" from="180 100 80" to="540 100 80" dur="18s" repeatCount="indefinite" />
        </circle>
        <circle cx="63" cy="100" r="7" fill="hsl(205,55%,62%)" opacity="0.85">
          <animateTransform attributeName="transform" type="rotate" from="270 100 80" to="630 100 80" dur="22s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  )
}

export default function PricingPage() {
  return (
    <div style={{ background: cream, color: charcoal, fontFamily: sans }}>
      <style>{pricingCSS}</style>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '88px 24px 64px' }}>

        {/* Eyebrow + headline */}
        <p style={{
          fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: gray, textAlign: 'center', marginBottom: 20, fontWeight: 500,
        }}>
          Pricing
        </p>
        <h1 style={{
          fontFamily: serif, fontWeight: 400, fontSize: 'clamp(32px,5vw,48px)',
          lineHeight: 1.15, textAlign: 'center', margin: '0 0 20px', letterSpacing: '-0.01em',
        }}>
          Start free.<br />Go <em>deeper</em> when you&apos;re ready.
        </h1>
        <p style={{
          textAlign: 'center', maxWidth: 480, margin: '0 auto 72px',
          color: charcoalSoft, fontSize: 16, lineHeight: 1.6,
        }}>
          Bearing is free to begin, no account required. When you want the full picture, one payment unlocks everything else — for good.
        </p>

        {/* Cards */}
        <div className="pr-cards">

          {/* Free card */}
          <div style={{
            background: white, border: `1px solid ${line}`, borderRadius: 18,
            padding: '40px 32px', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ height: 140, position: 'relative', marginBottom: 28 }}>
              <FreeBlob />
            </div>
            <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: gray, marginBottom: 10, fontWeight: 500 }}>
              To start
            </p>
            <p style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, margin: '0 0 6px' }}>
              Your core patterns
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 28 }}>
              <span style={{ fontFamily: serif, fontSize: 34, fontStyle: 'italic' }}>Free</span>
              <span style={{ fontSize: 13, color: gray }}>no card, no account needed</span>
            </div>
            <ul style={{ listStyle: 'none', margin: '0 0 32px', padding: 0, flexGrow: 1 }}>
              {[
                'Full trait-by-trait patterns — not a score, an explanation of what shows up and why',
                'Every pattern written specifically for your answers, and yours to keep',
                'A living report that grows as more patterns surface',
              ].map((item, i) => (
                <li key={i} style={{
                  fontSize: 14.5, lineHeight: 1.5, padding: '10px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${line}`,
                  color: charcoalSoft,
                }}>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/onboarding" className="pr-cta" style={{
              display: 'block', textAlign: 'center', padding: '13px 20px', borderRadius: 10,
              fontSize: 14.5, fontWeight: 500, textDecoration: 'none', transition: 'opacity 0.15s ease',
              background: charcoal, color: cream,
            }}>
              Begin →
            </Link>
          </div>

          {/* Paid card */}
          <div style={{
            background: charcoal, border: `1px solid ${charcoal}`, borderRadius: 18,
            padding: '40px 32px', display: 'flex', flexDirection: 'column', color: cream,
          }}>
            <div style={{ height: 140, position: 'relative', marginBottom: 28 }}>
              <PaidBlob />
            </div>
            <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A6A29A', marginBottom: 10, fontWeight: 500 }}>
              The full picture
            </p>
            <p style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, margin: '0 0 6px' }}>
              Everything else
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 28 }}>
              <span style={{ fontFamily: serif, fontSize: 34, fontStyle: 'italic' }}>€49</span>
              <span style={{ fontSize: 13, color: '#A6A29A' }}>one payment, not a subscription</span>
            </div>
            <ul style={{ listStyle: 'none', margin: '0 0 32px', padding: 0, flexGrow: 1 }}>
              {[
                'See how your patterns actually play out — in how you connect, work, and decide what\'s next',
                'Five more branches, each grounded in a different part of your life, added to the same report',
                'Concrete things worth trying, not just things about yourself',
                'One payment. Yours for as long as you want it.',
              ].map((item, i) => (
                <li key={i} style={{
                  fontSize: 14.5, lineHeight: 1.5, padding: '10px 0',
                  borderTop: i === 0 ? 'none' : '1px solid #3A3833',
                  color: '#C9C6BE',
                }}>
                  {item}
                </li>
              ))}
            </ul>
            {/* ⚠ Wire href to Stripe checkout session once implemented */}
            <a href="#checkout" className="pr-cta" style={{
              display: 'block', textAlign: 'center', padding: '13px 20px', borderRadius: 10,
              fontSize: 14.5, fontWeight: 500, textDecoration: 'none', transition: 'opacity 0.15s ease',
              background: cream, color: charcoal,
            }}>
              Unlock the full picture →
            </a>
          </div>

        </div>

        {/* Reassurance strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 56, flexWrap: 'wrap' }}>
          {[
            'One payment, ever',
            'No subscription',
            'Free to start',
            'Keep your report for good',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: charcoalSoft }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: teal, flexShrink: 0, display: 'inline-block' }} />
              {item}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
