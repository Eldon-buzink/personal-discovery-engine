// The one facet the landing page's practice examples use (see
// landingPracticeFixture.ts). Kept in its own tiny module so anything
// outside the lazy-loaded phone screens can name it without pulling the
// fixture's date helpers into the page's main bundle.
//
// Used as its own display label: facetDisplayLabel only renames
// 'Liberalism' (to "Values"), so 'Self-Discipline' displays as is.
export const LANDING_PRACTICE_FACET_ID = 'Self-Discipline'
