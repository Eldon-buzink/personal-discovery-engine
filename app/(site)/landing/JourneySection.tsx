'use client'

import { useMemo } from 'react'
import { useEnterOnce } from '@/lib/design/motion'
import PracticeHomeCard from '@/components/known/practice/PracticeHomeCard'
import CheckInAnswerRows from '@/components/known/practice/CheckInAnswerRows'
import { RecentNotes, WeekCallout, WeeksStrip } from '@/components/known/practice/PatternReportParts'
import { buildJourneyExample } from '@/lib/known/journeyExample'
import { landingPracticeFixture, type LandingPracticeFixture } from './landingPracticeFixture'

// "Your practice" on the landing pages: the three real practice components
// (no device frames), fed by lib/known/journeyExample.ts, which runs the
// fixture's check-in rows through the app's own trend functions. Nothing is
// clickable; one "Example" label covers the whole group.
//
// fixture: the Self-Discipline example by default (home page); the
// mini-assessment landing pages pass practiceFixtureFor(their facet).
export default function JourneySection({ fixture = landingPracticeFixture }: { fixture?: LandingPracticeFixture }) {
  const ex = useMemo(() => buildJourneyExample(fixture), [fixture])
  // Once on entering view: today's answer gets selected, then the week
  // chips fill in one by one. Not scroll-linked; final state by default.
  const motionRef = useEnterOnce<HTMLDivElement>()

  return (
    <div ref={motionRef} className="journey" aria-label="An example of the practice">
      <p className="journey-example">Example</p>
      <div className="journey-grid">
        <div className="journey-step journey-step-home">
          <PracticeHomeCard facetId={ex.facetId} {...ex.home} showUnlockLine={false} />
        </div>

        <div className="journey-step journey-step-checkin">
          <p className="font-display font-normal text-display-4 text-charcoal" style={{ marginBottom: 12 }}>
            {ex.checkIn.question}
          </p>
          <CheckInAnswerRows options={ex.checkIn.options} selected={ex.checkIn.selected} />
        </div>

        <div className="journey-step journey-step-recap">
          <WeekCallout facetId={ex.facetId} weekly={ex.recap.weekly} />
          <WeeksStrip facetId={ex.facetId} weeks={ex.recap.weeks} chipClassName="journey-chip" />
          <RecentNotes notes={ex.recap.notes} />
        </div>
      </div>
    </div>
  )
}
