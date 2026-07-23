/**
 * lib/known/branchSuggestion.ts
 *
 * ── WHAT THIS DOES ──────────────────────────────────────────────────────
 * Looks at every Ring 1 facet the user has resolved so far and scores each
 * *uncompleted* branch by how relevant it is, using a fixed weight table
 * (facet → branch affinity). If one branch clearly stands out, we suggest
 * it by name and explain why using the specific facet(s) that drove it.
 * If nothing stands out yet, we fall back to a fixed default order so the
 * user always has a next step — we just don't pretend it's personalized.
 *
 * ── WHERE THE OUTPUT GOES ───────────────────────────────────────────────
 * The `reason` string is written to read as the copy inside the existing
 * branch-suggestion card on /report (the one with the gradient animated
 * border) and in the sticky bottom bar CTA. It should NOT be treated as a
 * separate UI element — same card, same placement, this just decides
 * which branch it points to and what the one-liner says.
 *
 * Two tones, matching the rest of Bearing's copy voice (direct, warm, no
 * hype):
 *   - Targeted: "Your Cooperation and Orderliness came through strongly —
 *     worth seeing how that shows up in how you work."
 *   - Fallback: "You've covered good ground — this one rounds out the
 *     picture."
 * Fallback copy must stay honest and generic — never dress up the default
 * order as if it were a specific insight. Users will notice if every
 * suggestion sounds equally "we noticed something," so the two tones need
 * to stay audibly different.
 *
 * ── TUNING ───────────────────────────────────────────────────────────────
 * MIN_CONTRIBUTING_FACETS and MIN_MARGIN below are the two knobs to adjust
 * after watching real usage. Raise MIN_MARGIN if suggestions feel too
 * eager/wrong; lower it if the fallback fires too often and suggestions
 * feel generic for too long.
 * ───────────────────────────────────────────────────────────────────────
 */

export type Branch =
  | "environment"
  | "relationships"
  | "energy"
  | "working_style"
  | "direction";

export type ScoreDirection = "high" | "mid" | "low";

export interface PatternContent {
  facet: string;
  traitWord: string;
  scoreDirection: ScoreDirection;
  branch: string; // 'ring1' for Ring 1 facets, or a branch id once branches produce their own patterns
  dimensionScores?: Record<string, number>;
  strongConditions?: { label: string; score: number }[];
  content: {
    trait_quote: string;
    where_it_shows_up: string;
    tags: string[];
    go_deeper: string;
    worth_trying: string;
  };
}

export interface BranchSuggestion {
  branch: Branch;
  reason: string;
  isTargeted: boolean; // false = fallback/default-order suggestion
  contributingFacets?: string[]; // only present when isTargeted
}

// ── Tuning knobs ────────────────────────────────────────────────────────
const MIN_CONTRIBUTING_FACETS = 2; // top branch needs at least this many facets pulling toward it
const MIN_MARGIN = 0.3; // top branch score must beat 2nd place by this fraction (0.3 = 30%)

// ── Weight table ────────────────────────────────────────────────────────
// facet name (must match `facet` field used in ring1-questions.ts / scoring.ts)
// → weight per branch. Both high and low scoreDirection count as signal for
// now — direction-specific weighting (e.g. only "low Cautiousness" counting
// for Working Style) is a possible future refinement, not yet applied.
const BRANCH_WEIGHTS: Record<string, Partial<Record<Branch, number>>> = {
  // Neuroticism
  "Anxiety": { relationships: 2, energy: 1 },
  "Anger": { relationships: 2, working_style: 1 },
  "Depression": { energy: 2 },
  "Self-Consciousness": { relationships: 2, energy: 1 },
  "Immoderation": { working_style: 1 },
  "Vulnerability": { relationships: 1, energy: 2 },

  // Extraversion
  "Friendliness": { relationships: 2, direction: 1 },
  "Gregariousness": { relationships: 2, energy: 1 },
  "Assertiveness": { relationships: 1, working_style: 2, direction: 1 },
  "Activity Level": { energy: 2, working_style: 1 },
  "Excitement-Seeking": { direction: 2 },
  "Cheerfulness": { relationships: 1, energy: 1 },

  // Openness
  "Imagination": { direction: 2 },
  "Artistic Interests": { direction: 2 },
  "Emotionality": { relationships: 2 },
  "Adventurousness": { direction: 2 },
  "Intellect": { working_style: 1, direction: 2 },
  "Liberalism": { direction: 1 },

  // Agreeableness
  "Trust": { relationships: 2 },
  "Morality": { relationships: 1, working_style: 1 },
  "Altruism": { relationships: 2, working_style: 1 },
  "Cooperation": { relationships: 2, working_style: 2 },
  "Modesty": { relationships: 1 },
  "Sympathy": { relationships: 2 },

  // Conscientiousness
  "Self-Efficacy": { energy: 1, working_style: 1, direction: 1 },
  "Orderliness": { working_style: 2 },
  "Dutifulness": { energy: 1, working_style: 2 },
  "Achievement-Striving": { energy: 2, working_style: 1, direction: 2 },
  "Self-Discipline": { energy: 2, working_style: 2 },
  "Cautiousness": { working_style: 2 },
};

// Fixed fallback order — used when no branch clears the confidence bar.
// Sequenced by lowest-friction / most-reliably-resolved-early first.
const DEFAULT_ORDER: Branch[] = [
  "environment",
  "working_style",
  "direction",
  "relationships",
  "energy",
];

const FALLBACK_REASONS = [
  "You've covered good ground — this one rounds out the picture.",
  "There's more to see here — this branch fills in a different part of the picture.",
  "Nothing's jumped out yet, but this one's worth exploring next.",
];

function computeBranchScores(
  patternContents: PatternContent[],
  remaining: Branch[]
): Record<Branch, { total: number; facets: string[] }> {
  // Only Ring 1 facets feed the weight table (branch === 'ring1').
  const resolvedRing1Facets = patternContents.filter((p) => p.branch === "ring1");

  const scores: Record<Branch, { total: number; facets: string[] }> = {
    environment: { total: 0, facets: [] },
    relationships: { total: 0, facets: [] },
    energy: { total: 0, facets: [] },
    working_style: { total: 0, facets: [] },
    direction: { total: 0, facets: [] },
  };

  for (const pattern of resolvedRing1Facets) {
    if (pattern.scoreDirection === "mid") continue; // mid = no strong signal either way
    const weights = BRANCH_WEIGHTS[pattern.facet];
    if (!weights) continue;
    for (const [branch, weight] of Object.entries(weights) as [Branch, number][]) {
      if (!remaining.includes(branch)) continue;
      scores[branch].total += weight;
      scores[branch].facets.push(pattern.facet);
    }
  }

  return scores;
}

/**
 * Suggests the next branch for the user to explore, or null if all
 * branches are already completed.
 */
export function suggestNextBranch(
  patternContents: PatternContent[],
  completedBranches: Branch[]
): BranchSuggestion | null {
  const remaining = DEFAULT_ORDER.filter((b) => !completedBranches.includes(b));
  if (remaining.length === 0) return null;

  const scores = computeBranchScores(patternContents, remaining);

  const ranked = remaining
    .map((branch) => ({ branch, ...scores[branch] }))
    .sort((a, b) => b.total - a.total);

  const [top, second] = ranked;

  const clearsBar =
    top.total > 0 &&
    top.facets.length >= MIN_CONTRIBUTING_FACETS &&
    (second === undefined || second.total === 0 || (top.total - second.total) / top.total >= MIN_MARGIN);

  if (clearsBar) {
    return {
      branch: top.branch,
      isTargeted: true,
      contributingFacets: top.facets,
      reason: buildTargetedReason(top.branch, top.facets),
    };
  }

  // Fallback: first uncompleted branch in default order.
  const fallbackBranch = remaining[0];
  return {
    branch: fallbackBranch,
    isTargeted: false,
    reason: pickFallbackReason(fallbackBranch),
  };
}

export interface QualifyingBranch {
  branch: Branch;
  reason: string;
  contributingFacets: string[];
  score: number;
}

/**
 * Returns every uncompleted branch that clears the same per-branch confidence
 * bar suggestNextBranch uses for its top pick (total > 0, at least
 * MIN_CONTRIBUTING_FACETS pulling toward it) — ranked, not just the winner.
 * MIN_MARGIN (rank-1-vs-rank-2 separation) intentionally does NOT apply here:
 * that knob exists to pick a single confident winner, which isn't a meaningful
 * concept when the point is to list every branch with real signal. Returns an
 * empty array if nothing clears the bar yet — callers should fall back to
 * suggestNextBranch's fallback reasoning in that case, not treat "no
 * qualifying branches" as "no suggestion at all."
 */
export function suggestQualifyingBranches(
  patternContents: PatternContent[],
  completedBranches: Branch[]
): QualifyingBranch[] {
  const remaining = DEFAULT_ORDER.filter((b) => !completedBranches.includes(b));
  if (remaining.length === 0) return [];

  const scores = computeBranchScores(patternContents, remaining);

  return remaining
    .map((branch) => ({ branch, ...scores[branch] }))
    .filter((b) => b.total > 0 && b.facets.length >= MIN_CONTRIBUTING_FACETS)
    .sort((a, b) => b.total - a.total)
    .map((b) => ({
      branch: b.branch,
      contributingFacets: b.facets,
      score: b.total,
      reason: buildTargetedReason(b.branch, b.facets),
    }));
}

function buildTargetedReason(branch: Branch, facets: string[]): string {
  const facetList = formatFacetList(facets.slice(0, 2)); // cap at 2 for readable copy
  return `Your ${facetList} came through strongly — worth seeing how that shows up in ${branchContext(branch)}.`;
}

function branchContext(branch: Branch): string {
  switch (branch) {
    case "relationships":
      return "how you connect with people";
    case "energy":
      return "what fuels or drains you day to day";
    case "working_style":
      return "how you work";
    case "direction":
      return "where you're headed next";
    case "environment":
      return "the conditions you do your best in";
  }
}

function formatFacetList(facets: string[]): string {
  if (facets.length === 1) return facets[0];
  return `${facets[0]} and ${facets[1]}`;
}

function pickFallbackReason(branch: Branch): string {
  // Deterministic-ish pick so the same branch doesn't reshuffle copy on
  // every render — swap for a stored/generated value once this ships.
  const index = DEFAULT_ORDER.indexOf(branch) % FALLBACK_REASONS.length;
  return FALLBACK_REASONS[index];
}
