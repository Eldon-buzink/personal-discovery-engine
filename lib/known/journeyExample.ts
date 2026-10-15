/**
 * lib/known/journeyExample.ts
 *
 * The landing page's "Your practice" example, built ONLY by running the
 * fixture's check-in rows through the same functions the practice screens
 * use. Nothing shown on the landing page is typed by hand: the stage line,
 * the weekly progress, the week headline, the four week chips and the note
 * all come out of these calls.
 *
 * - Step 1 (Practice home card) is the state before today's check-in.
 * - Step 2 (the check-in rows) shows today's answer selected.
 * - Step 3 (the recap) is the state right after it: the weekly callout,
 *   the Wk 1 to Wk 4 strip and one "What you wrote" entry.
 */

import { getCheckInPrompt, type CheckInOption, type CheckInOptionId } from './checkInOptions'
import { computeWeeklyInsight, formatWeeklyProgress, type WeeklyInsightResult } from './weeklyInsight'
import { computeRecentWeeksReport } from './recentWeeksReport'
import { computeTrend } from './trend'
import { computeStage, formatStageCompact } from './practiceStage'
import { selectRecentNotes, type CheckInNote } from './checkInNotes'
import { MINI_ASSESSMENT_BAND_COPY, type MiniAssessmentFacet } from './miniAssessmentScoring'
import type { WeekSummary } from './weekSummary'
import { materializeFixture, type LandingPracticeFixture } from '../../app/(site)/landing/landingPracticeFixture'

export interface JourneyExample {
  facetId: string
  home: {
    showBadge: boolean
    bodyCopy: string
    stageLine: string
    checkedInToday: false
    weeklyQualifies: boolean
    weeklyProgress: string | null
  }
  checkIn: { question: string; options: CheckInOption[]; selected: CheckInOptionId }
  recap: { weekly: WeeklyInsightResult; weeks: WeekSummary[]; notes: CheckInNote[] }
}

export function buildJourneyExample(fixture: LandingPracticeFixture, reference: Date = new Date()): JourneyExample {
  const m = materializeFixture(fixture, reference)
  const weeklyBefore = computeWeeklyInsight(m.before, m.periodStartedAt, m.now)
  const stage = computeStage(
    computeTrend(m.before, m.periodStartedAt, m.now).qualifyingWeekCount,
    computeRecentWeeksReport(m.before, m.periodStartedAt, m.now).checkInCount,
  )
  const prompt = getCheckInPrompt(fixture.facetId)
  const weeklyAfter = computeWeeklyInsight(m.after, m.periodStartedAt, m.now)
  const recentAfter = computeRecentWeeksReport(m.after, m.periodStartedAt, m.now)
  return {
    facetId: fixture.facetId,
    home: {
      showBadge: fixture.directional,
      bodyCopy: MINI_ASSESSMENT_BAND_COPY[fixture.facetId as MiniAssessmentFacet][fixture.startBand],
      stageLine: formatStageCompact(stage),
      checkedInToday: false,
      weeklyQualifies: weeklyBefore.summary.qualifies,
      weeklyProgress: formatWeeklyProgress(weeklyBefore),
    },
    checkIn: { question: prompt.question, options: prompt.options, selected: fixture.today.option },
    // One note on the landing page ("one What you wrote entry").
    recap: { weekly: weeklyAfter, weeks: recentAfter.weeks, notes: selectRecentNotes(m.after).slice(0, 1) },
  }
}
