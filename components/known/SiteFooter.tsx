// Server component — no interactivity needed

import Link from 'next/link'

const charcoal = '#1C1C1A'
const sans     = 'var(--font-inter), system-ui, sans-serif'
const serif    = 'var(--font-newsreader), Georgia, serif'
const cream70  = 'rgba(245,242,235,0.70)'
const cream40  = 'rgba(245,242,235,0.40)'
const cream14  = 'rgba(245,242,235,0.14)'

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Pricing',      href: '/pricing'        },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',   href: '/about'   },
      { label: 'Blog',    href: '/blog'    },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms',   href: '/terms'   },
    ],
  },
]

// Small static blob mark — organic SVG echoing the blob motif without RAF overhead
function BlobMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M20 4 C 27 3 35 9 35.5 17 C 36 25 30 35 22 36 C 14 37 5 31 5 22 C 5 13 11 5 20 4 Z"
        fill={cream40}
      />
    </svg>
  )
}

export default function SiteFooter() {
  return (
    <footer style={{ background: charcoal, fontFamily: sans }}>

      {/* ── Three-column grid ─────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '64px 48px 52px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 32,
      }}>
        {COLUMNS.map(col => (
          <div key={col.heading}>
            <p style={{
              fontFamily: sans, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: cream40, marginBottom: 16,
            }}>
              {col.heading}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.links.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    style={{
                      fontFamily: sans, fontSize: 14,
                      color: cream70, textDecoration: 'none',
                      transition: 'color 0.15s',
                    }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '20px 48px',
        borderTop: `1px solid ${cream14}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BlobMark />
          <span style={{ fontFamily: serif, fontSize: 17, fontWeight: 300, color: cream70, letterSpacing: '-0.02em' }}>
            Known
          </span>
        </div>
        <p style={{ fontFamily: sans, fontSize: 12, color: cream40, margin: 0 }}>
          © {new Date().getFullYear()} Known. All rights reserved.
        </p>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .sf-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </footer>
  )
}
