'use client'

import Link from 'next/link'
import SampleReportBody, { charcoal, charcoalSoft, cream, line, sans, serif } from './SampleReportBody'
import SiteNav, { NAV_H } from '@/components/known/SiteNav'
import SiteFooter from '@/components/known/SiteFooter'

// Static example report shown behind the landing page's "See an example
// report" CTA. Reuses the real report page's presentational components
// (InteractiveCluster/UnlockedContent/OrbitCluster, shared via
// components/known/ReportVisuals.tsx) so the sample stays visually
// identical to a real one — but with fixed illustrative content instead of
// localStorage/Supabase-backed data, no paywall, and everything unlocked.

export default function SampleReportClient() {
  return (
    <>
      <SiteNav />

      <div style={{ background: cream, minHeight: '100vh', paddingTop: NAV_H }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 22px 64px' }}>

          <SampleReportBody />

          {/* ── CTA ───────────────────────────────────────── */}
          <div style={{ marginTop: 56, paddingTop: 32, borderTop: `1px solid ${line}`, textAlign: 'center' }}>
            <p style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, color: charcoal, margin: '0 0 10px', lineHeight: 1.35 }}>
              Curious what yours would say?
            </p>
            <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, maxWidth: 340, margin: '0 auto 22px', lineHeight: 1.6 }}>
              15 minutes, first 5 patterns free — no account needed to start.
            </p>
            <Link href="/onboarding">
              <button style={{
                background: charcoal, color: cream, borderRadius: 9999, border: 'none',
                padding: '15px 30px', fontFamily: sans, fontSize: 14.5, fontWeight: 500, cursor: 'pointer',
                minHeight: 44,
              }}>
                Start your report — it&apos;s free
              </button>
            </Link>
          </div>

        </div>
      </div>
      <SiteFooter />
    </>
  )
}
