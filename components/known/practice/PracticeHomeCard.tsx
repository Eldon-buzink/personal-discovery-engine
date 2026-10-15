import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { facetDisplayLabel } from '@/lib/known/miniAssessmentScoring'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'

// One active practice card from the Practice home page, as a pure,
// presentational component: everything comes in as props, no data loading.
// Used by app/(app)/practice/page.tsx (with links) and by the landing page's
// example (no links: hrefs omitted, so nothing is clickable).
export interface PracticeHomeCardProps {
  facetId: string
  showBadge: boolean
  // The band read (directional) or facet description shown under the name.
  bodyCopy: string
  stageLine: string | null
  checkedInToday: boolean
  weeklyQualifies: boolean
  weeklyProgress: string | null
  hrefs?: { detail: string; checkin: string; report: string }
  // The landing example hides the €49 line: the landing page's practice
  // section makes no free/paid statement (owner's call). Default: shown.
  showUnlockLine?: boolean
}

function MaybeLink({ href, className, style, children }: { href?: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  return href ? (
    <Link href={href} className={className} style={style}>{children}</Link>
  ) : (
    <div className={className} style={style}>{children}</div>
  )
}

export default function PracticeHomeCard({
  facetId, showBadge, bodyCopy, stageLine, checkedInToday, weeklyQualifies, weeklyProgress, hrefs, showUnlockLine = true,
}: PracticeHomeCardProps) {
  return (
    <div
      style={{
        padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10,
        border: showBadge ? `1.5px solid ${directionalAccent}` : '1px solid #E5E1D5',
        background: showBadge ? directionalSoft : '#FFFFFF',
      }}
    >
      {/* Review feedback: this used to be a solid-fill orange pill, the
          loudest thing on the card. The card's own tinted background and
          border carry the "this one's directional" signal; the label says it
          in words. */}
      {showBadge && (
        <p className="font-sans text-meta text-muted">
          Directional · from mini-assessment
        </p>
      )}
      <MaybeLink href={hrefs?.detail} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="font-display font-normal text-display-4 text-charcoal">
          {facetDisplayLabel(facetId)}
        </span>
        <p className="font-sans text-body text-charcoal-soft">
          {bodyCopy}
        </p>
        {/* Compact ladder: the same stage the facet's detail page shows. */}
        {stageLine && (
          <p className="font-sans text-meta text-muted">
            {stageLine}
          </p>
        )}
      </MaybeLink>
      {showBadge && showUnlockLine && (
        <p
          className="font-sans text-meta"
          style={{ color: '#8a5a3d', paddingTop: 8, borderTop: '1px solid color-mix(in srgb, var(--accent-flag) 30%, transparent)' }}
        >
          Unlock the full assessment (€49) for a complete, non-directional read on this pattern.
        </p>
      )}
      {checkedInToday ? (
        // A distinct, non-clickable confirmed state: check_ins is one row per
        // day, so there's nothing to do again today.
        <div
          className="font-sans font-medium text-ui"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            textAlign: 'center', padding: 11, minHeight: 44, borderRadius: 8,
            border: '1px solid #DAD3C3', color: '#6b6659',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="#6b6659" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Checked in today
        </div>
      ) : (
        <MaybeLink
          href={hrefs?.checkin}
          className="font-sans font-medium text-ui"
          style={{ display: 'block', textAlign: 'center', padding: 11, minHeight: 44, borderRadius: 8, background: '#262420', color: '#F7F4ED' }}
        >
          Check in today
        </MaybeLink>
      )}
      {weeklyQualifies ? (
        <MaybeLink
          href={hrefs?.report}
          className="font-sans font-medium text-ui text-charcoal"
          style={{ textDecoration: 'underline', textAlign: 'center' }}
        >
          Your weekly read is ready
        </MaybeLink>
      ) : (
        weeklyProgress && (
          <p className="font-sans text-meta text-muted" style={{ textAlign: 'center' }}>
            {weeklyProgress}
          </p>
        )
      )}
    </div>
  )
}
