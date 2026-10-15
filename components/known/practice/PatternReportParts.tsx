import { format, addDays } from 'date-fns'
import { checkInOptionWord } from '@/lib/known/checkInOptions'
import { directionalAccent, directionalSoft } from '@/lib/known/practiceTokens'
import { formatWeekHeadline } from '@/lib/known/reportCopy'
import { parseCheckInDate, type WeekSummary } from '@/lib/known/weekSummary'
import type { WeeklyInsightResult } from '@/lib/known/weeklyInsight'
import type { CheckInNote } from '@/lib/known/checkInNotes'
import { WEEKLY_CHECKIN_FLOOR } from '@/lib/known/practiceConfig'
import { type } from '@/lib/design/type'

// The pieces of a facet's practice report, presentational (props only).
// Composed by app/(app)/practice/[activationId]/report/page.tsx and, as an
// example, by the landing page's journey section.

export function weekRangeLabel(weekStart: Date): string {
  return `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d')}`
}

// "This week" callout.
export function WeekCallout({ facetId, weekly }: { facetId: string; weekly: WeeklyInsightResult }) {
  return (
    <div>
      <p className="font-sans text-meta text-muted" style={{ marginBottom: 10 }}>
        This week · {weekRangeLabel(weekly.weekStart)}
      </p>
      <div style={{ padding: 18, borderRadius: 14, background: directionalSoft, border: `1.5px solid ${directionalAccent}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p className="font-display font-normal text-display-4 text-charcoal">
          {formatWeekHeadline(facetId, weekly)}
        </p>
        {!weekly.summary.qualifies && weekly.summary.checkInCount > 0 && (
          <p className="font-sans text-meta text-muted">
            {WEEKLY_CHECKIN_FLOOR - weekly.summary.checkInCount} more this week for a weekly read.
          </p>
        )}
      </div>
    </div>
  )
}

// The recent-weeks window: distribution line, count, optional start-vs-now.
export function WindowCard({ distributionLine, checkInCount, comparisonLine }: {
  distributionLine: string | null
  checkInCount: number
  comparisonLine: string | null
}) {
  return (
    <div style={{ padding: 18, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E5E1D5', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
      {distributionLine ? (
        <>
          <p className="font-display font-normal text-display-4 text-charcoal">
            {distributionLine}
          </p>
          <p className="font-sans text-meta text-muted">
            Based on {checkInCount} check-in{checkInCount === 1 ? '' : 's'}.
          </p>
        </>
      ) : (
        <p className="font-display font-normal text-display-4 text-charcoal">
          No check-ins logged in this window yet.
        </p>
      )}
      {comparisonLine && (
        <p className="font-sans text-muted" style={{ ...type.meta, paddingTop: 4, borderTop: '1px solid #E5E1D5' }}>
          {comparisonLine}
        </p>
      )}
    </div>
  )
}

// The Wk 1 to Wk 4 strip: one chip per ISO week, the week's lean word when
// it qualifies (3+ check-ins), a dash when it doesn't. chipClassName lets the
// landing page animate the chips; the app passes nothing.
export function WeeksStrip({ facetId, weeks, chipClassName }: { facetId: string; weeks: WeekSummary[]; chipClassName?: string }) {
  return (
    <div className="flex" style={{ gap: 6 }}>
      {weeks.map((w, i) => (
        <div
          key={i}
          className={chipClassName}
          style={{
            flex: 1, padding: '8px 6px', borderRadius: 9, textAlign: 'center',
            border: w.qualifies ? '1px solid #DAD3C3' : '1px dashed #DAD3C3',
            background: w.qualifies ? '#FFFFFF' : 'transparent',
            ['--i' as string]: i,
          }}
        >
          <div className="font-sans text-meta text-muted" style={{ marginBottom: 3 }}>
            Wk {i + 1}
          </div>
          <div style={w.qualifies ? { ...type.traitWord, fontSize: 13, color: '#262420' } : { ...type.meta }}>
            {w.qualifies
              ? w.lean.type === 'option'
                ? checkInOptionWord(facetId, w.lean.value)
                : w.lean.type === 'tie'
                  ? 'Split'
                  : ''
              : 'Too few'}
          </div>
        </div>
      ))}
    </div>
  )
}

// "What you wrote": notes exactly as typed.
export function RecentNotes({ notes }: { notes: CheckInNote[] }) {
  if (notes.length === 0) return null
  return (
    <div>
      <p className="font-sans text-meta text-muted" style={{ marginBottom: 10 }}>
        What you wrote
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notes.map((n) => (
          <div key={n.date} style={{ padding: '12px 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E5E1D5' }}>
            <p className="font-sans text-meta text-muted" style={{ marginBottom: 4 }}>
              {format(parseCheckInDate(n.date), 'MMM d')}
            </p>
            <p className="font-sans text-body text-charcoal-soft">
              {n.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
