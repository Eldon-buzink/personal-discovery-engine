// Report lab: the states the sticky bar and closing panel are designed for.
// A plain module so server pages and client components can both use it.

export type BarState = 'not-started' | 'in-progress' | 'locked' | 'paid-unfinished' | 'paid-done'
export const BAR_STATES: BarState[] = ['not-started', 'in-progress', 'locked', 'paid-unfinished', 'paid-done']
