'use client'

import dynamic from 'next/dynamic'
import { useEnterOnce } from '@/lib/design/motion'
import WhenNear from './WhenNear'
import { landingPracticeFixture, type LandingPracticeFixture } from './landingPracticeFixture'

// "Your practice" on the landing pages, told in three steps. The step
// markers and captions are plain markup (server-rendered wherever the page
// itself is); the three real practice components under them load only
// when they come near the viewport, each in a box that reserves its
// height (.journey-hold-*), so nothing shifts when they arrive. One
// "Example" label covers the group. The facts in the captions are the
// product's: one check-in a day, and a weekly read once a week has
// WEEKLY_CHECKIN_FLOOR check-ins.
//
// Entrance (once, lib/design/motion.ts): the line from step 1 to 2 draws,
// then 2 to 3; today's answer turns selected; the week chips fill in.
// Ends within 1.2 s.
//
// fixture: the Self-Discipline example by default (home page); the
// mini-assessment landing pages pass practiceFixtureFor(their facet).

const JourneyHome = dynamic(() => import('./JourneyParts').then((m) => m.JourneyHome), { ssr: false })
const JourneyCheckIn = dynamic(() => import('./JourneyParts').then((m) => m.JourneyCheckIn), { ssr: false })
const JourneyRecap = dynamic(() => import('./JourneyParts').then((m) => m.JourneyRecap), { ssr: false })

export default function JourneyStory({ fixture = landingPracticeFixture }: { fixture?: LandingPracticeFixture }) {
  const motionRef = useEnterOnce<HTMLDivElement>()
  // Only fixtures with notes show a "What you wrote" entry in the recap.
  const hasNotes = fixture.checkIns.some((c) => c.note)
  return (
    <div ref={motionRef} className="journey">
      <p className="journey-example">Example</p>
      <ol className="journey-steps">
        <li className="journey-step">
          <div className="journey-marker-row">
            <span className="journey-marker" aria-hidden="true">1</span>
            <span className="journey-line m-item" style={{ ['--d' as string]: '0ms' }} aria-hidden="true" />
          </div>
          <p className="journey-caption">Pick a pattern to follow.</p>
          <WhenNear className="journey-card journey-hold-home">
            <JourneyHome fixture={fixture} />
          </WhenNear>
        </li>
        <li className="journey-step">
          <div className="journey-marker-row">
            <span className="journey-marker" aria-hidden="true">2</span>
            <span className="journey-line m-item" style={{ ['--d' as string]: '300ms' }} aria-hidden="true" />
          </div>
          <p className="journey-caption">Check in at the end of the day.</p>
          <WhenNear className="journey-card journey-hold-checkin">
            <JourneyCheckIn fixture={fixture} />
          </WhenNear>
        </li>
        <li className="journey-step">
          <div className="journey-marker-row">
            <span className="journey-marker" aria-hidden="true">3</span>
          </div>
          <p className="journey-caption">See what you noticed.</p>
          <p className="journey-note">Once you have enough check-ins, you get a short read of your week and the words you wrote.</p>
          <WhenNear className={`journey-card journey-card-recap journey-hold-recap${hasNotes ? ' journey-hold-notes' : ''}`}>
            <JourneyRecap fixture={fixture} />
          </WhenNear>
        </li>
      </ol>
    </div>
  )
}
