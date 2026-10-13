// Seed data shared by specs.

// One revealed Ring 1 trait (Anxiety, items 1–4 answered 4). Real users reach
// a branch from the report, so they already have Ring 1 results; the report
// only shows branch sections alongside those.
export const RING1_SEED = {
  questionOrder: Array.from({ length: 120 }, (_, i) => i + 1),
  responses: [1, 2, 3, 4].map((id) => ({ questionId: id, value: 4, answeredAt: '2026-10-01T10:00:00.000Z' })),
  patternShown: { facet: 'Anxiety', traitWord: 'Watchful', answeredAt: '2026-10-01T10:00:00.000Z' },
  revealedFacets: ['Anxiety'],
  patternContents: [{
    facet: 'Anxiety',
    traitWord: 'Watchful',
    scoreDirection: 'high',
    content: { trait_quote: 'E2E.', where_it_shows_up: 'E2E.', tags: ['E2E'], go_deeper: 'E2E.', worth_trying: 'E2E.' },
  }],
}
