/**
 * The one fixture behind all three "Your practice" phone screens on the
 * landing page. Written for the page, not taken from any user: no name,
 * no age, no backstory, one everyday facet. Every string the screens show
 * is computed from this by the real lib/known functions the app uses
 * (getCheckInPrompt, computeRecentWeeksReport, formatStartVsNow, …), so
 * the copy can't drift from the product's own templates.
 *
 * Dates are stored as offsets from the Monday that starts the activation
 * period and materialized against the current week, so the frames never
 * show a stale month or a future date. Four full ISO weeks; "today" is
 * the Sunday of the fourth (see materializeFixture).
 */

import { addDays, format, isSunday, startOfISOWeek, subWeeks } from 'date-fns'
import type { CheckInOptionId } from '@/lib/known/checkInOptions'
import type { BandId } from '@/lib/known/startVsNow'
import { LANDING_PRACTICE_FACET_ID } from './landingPracticeFacet'

export interface LandingPracticeFixture {
  facetId: string
  // Mini-assessment facet, so the real UI's "Directional" label applies.
  directional: boolean
  // Starting result band from the 6-question mini-assessment.
  startBand: BandId
  // Check-ins before today. day = days after the period start (Monday).
  checkIns: { day: number; option: CheckInOptionId; note?: string }[]
  // The check-in completed on screen 2 (day 27, the Sunday of week 4).
  today: { day: number; option: CheckInOptionId }
}

export const landingPracticeFixture: LandingPracticeFixture = {
  facetId: LANDING_PRACTICE_FACET_ID,
  directional: true,
  startBand: 'mid',
  checkIns: [
    // Week 1: leans Steady
    { day: 1, option: 'mid' },
    { day: 3, option: 'low' },
    { day: 5, option: 'mid' },
    // Week 2: leans Steady
    { day: 8, option: 'mid' },
    { day: 10, option: 'high' },
    { day: 12, option: 'mid' },
    // Week 3: leans Disciplined
    { day: 15, option: 'high' },
    { day: 17, option: 'high' },
    { day: 19, option: 'mid' },
    // Week 4
    { day: 22, option: 'high' },
    { day: 24, option: 'high', note: 'Finished the draft before lunch, then left email closed until it was done.' },
    { day: 26, option: 'high', note: 'Wanted to stop the run halfway. Kept going at an easier pace.' },
  ],
  today: { day: 27, option: 'high' },
}

// A neutral fixture for any other facet (used by the mini-assessment
// landing pages, one per facet): days mostly land on the middle option, so
// the recap reads "Mostly matches your starting result". Deliberately no
// drift — showing an Anxiety or Values check-in moving toward either end
// would imply something the product doesn't claim. No example notes for
// these facets, so the recap's "What you wrote" block stays hidden, as it
// does in the real report when there are none.
function steadyFixture(facetId: string): LandingPracticeFixture {
  const pattern: CheckInOptionId[] = ['mid', 'low', 'mid', 'mid', 'mid', 'high', 'mid', 'high', 'mid', 'mid', 'low', 'mid']
  const days = [1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26]
  return {
    facetId,
    directional: true,
    startBand: 'mid',
    checkIns: days.map((day, i) => ({ day, option: pattern[i] })),
    today: { day: 27, option: 'mid' },
  }
}

// The practice example for a facet: the Self-Discipline story used on the
// home page, or the neutral fixture above for any other facet.
export function practiceFixtureFor(facetId: string): LandingPracticeFixture {
  return facetId === landingPracticeFixture.facetId ? landingPracticeFixture : steadyFixture(facetId)
}

export interface MaterializedFixture {
  periodStartedAt: string
  now: Date
  before: { check_in_date: string; response_option: string; note: string | null }[]
  after: { check_in_date: string; response_option: string; note: string | null }[]
}

// "Today" (day 27, a Sunday) is the most recent Sunday that isn't in the
// future — today itself on a Sunday, otherwise last week's — so no date on
// screen is ever later than the visitor's real today.
export function materializeFixture(fixture: LandingPracticeFixture, reference: Date = new Date()): MaterializedFixture {
  const periodStart = subWeeks(startOfISOWeek(reference), isSunday(reference) ? 3 : 4)
  const date = (day: number) => format(addDays(periodStart, day), 'yyyy-MM-dd')
  const before = fixture.checkIns.map((c) => ({ check_in_date: date(c.day), response_option: c.option, note: c.note ?? null }))
  const after = [...before, { check_in_date: date(fixture.today.day), response_option: fixture.today.option, note: null }]
  return {
    periodStartedAt: periodStart.toISOString(),
    now: addDays(periodStart, fixture.today.day),
    before,
    after,
  }
}
