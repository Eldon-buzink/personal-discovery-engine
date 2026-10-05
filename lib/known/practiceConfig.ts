/**
 * lib/known/practiceConfig.ts
 *
 * Tunable knobs for the facet-to-tool practice system (see
 * reference/01-master-handover.md §2.2, §2.3). Named exported constants,
 * same pattern as REVEAL_CAP in lib/known/paywall.ts — start conservative,
 * tune from real engagement data once check-in completion rates exist.
 */

// Global concurrency cap — how many facets a user can have actively tracked
// (i.e. an open facet_activation_periods row) at once, shared across
// base_assessment and mini_assessment sources. Adding a facet beyond this
// should prompt a swap (deactivate one first), not a stack.
export const ACTIVE_FACET_CAP = 4

// Weekly engagement floor — a week needs at least this many check-ins to
// count toward trend/recap computation.
export const WEEKLY_CHECKIN_FLOOR = 3

// Trend window — multi-week lookback for surfacing a trend, and the minimum
// number of *qualifying* weeks (meeting WEEKLY_CHECKIN_FLOOR) within that
// window before a trend is shown at all.
export const TREND_LOOKBACK_WEEKS = 5
export const TREND_MIN_QUALIFYING_WEEKS = 3

// Low-engagement nudge — consecutive skipped days before the nudge is
// eligible to show. In-app-lazy: checked next time the user opens the app,
// not a scheduled/pushed notification.
export const LOW_ENGAGEMENT_NUDGE_THRESHOLD_DAYS = 5

// Rework Part 4 — the facet report's "4 weeks" window and the practice-wide
// milestone page's "90 days" window are both anchored to when the facet's
// current activation period started, not the calendar month/quarter. Before
// that many days have passed since activation, the window is "your first N
// {weeks/days}"; after, it becomes a rolling "last N {weeks/days}" window.
// See lib/known/periodWindow.ts.
export const REPORT_WINDOW_WEEKS = 4
export const MILESTONE_WINDOW_DAYS = 90

// Rework Part 3b — minimum check-ins within the report window before the
// "start vs. now" comparison will say anything beyond "not enough yet".
// Conservative on purpose: 9 is roughly REPORT_WINDOW_WEEKS worth of weeks
// each meeting WEEKLY_CHECKIN_FLOOR (3 weeks x 3 check-ins), i.e. the same
// rough order of magnitude as reaching the progress ladder's "does it fit?"
// stage — the comparison shouldn't claim to answer that question with less
// data than the ladder itself requires to ask it.
export const COMPARISON_MIN_CHECKINS = 9

// Rework Part 3c — "What you wrote" shows at most this many of the most
// recent notes, newest first.
export const RECENT_NOTES_LIMIT = 2
