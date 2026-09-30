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
