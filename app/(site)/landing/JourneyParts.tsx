'use client'

import PracticeHomeCard from '@/components/known/practice/PracticeHomeCard'
import CheckInAnswerRows from '@/components/known/practice/CheckInAnswerRows'
import { RecentNotes, WeekCallout, WeeksStrip } from '@/components/known/practice/PatternReportParts'
import { buildJourneyExample, type JourneyExample } from '@/lib/known/journeyExample'
import type { LandingPracticeFixture } from './landingPracticeFixture'

// The three real practice components in the journey example, loaded only
// when their step comes near the viewport (JourneyStory wraps each in
// WhenNear). All three read one buildJourneyExample() result, which runs
// the fixture's check-in rows through the app's own trend functions.
// Nothing is clickable.

const built = new WeakMap<LandingPracticeFixture, JourneyExample>()
function example(fixture: LandingPracticeFixture): JourneyExample {
  let ex = built.get(fixture)
  if (!ex) { ex = buildJourneyExample(fixture); built.set(fixture, ex) }
  return ex
}

export function JourneyHome({ fixture }: { fixture: LandingPracticeFixture }) {
  const ex = example(fixture)
  return <PracticeHomeCard facetId={ex.facetId} {...ex.home} showUnlockLine={false} />
}

export function JourneyCheckIn({ fixture }: { fixture: LandingPracticeFixture }) {
  const ex = example(fixture)
  return (
    <>
      <p className="font-display font-normal text-display-4 text-charcoal" style={{ marginBottom: 12 }}>
        {ex.checkIn.question}
      </p>
      <CheckInAnswerRows options={ex.checkIn.options} selected={ex.checkIn.selected} />
    </>
  )
}

export function JourneyRecap({ fixture }: { fixture: LandingPracticeFixture }) {
  const ex = example(fixture)
  return (
    <>
      <WeekCallout facetId={ex.facetId} weekly={ex.recap.weekly} />
      <WeeksStrip facetId={ex.facetId} weeks={ex.recap.weeks} chipClassName="journey-chip" />
      <RecentNotes notes={ex.recap.notes} />
    </>
  )
}
