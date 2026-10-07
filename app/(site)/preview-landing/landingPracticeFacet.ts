// The one facet the landing preview's practice examples use, shared by the
// fixture (landingPracticeFixture.ts) and the flow chart in
// PreviewLandingClient. Kept in its own tiny module so the flow chart, which
// renders above the fold of its section, doesn't pull the fixture's date
// helpers or the scoring tables into the page's main bundle.
//
// Used as its own display label: facetDisplayLabel only renames
// 'Liberalism' (to "Values"), so 'Self-Discipline' displays as is.
export const LANDING_PRACTICE_FACET_ID = 'Self-Discipline'
