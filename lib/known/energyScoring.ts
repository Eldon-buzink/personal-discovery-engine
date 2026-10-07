/**
 * lib/known/energyScoring.ts
 *
 * ── WHAT THIS DOES ──────────────────────────────────────────────────────
 * Scores the Your Energy branch (SDT-adapted, 24 items) and returns the
 * full ranking of fuel and drain categories.
 *
 * ── REVISION HISTORY ──────────────────────────────────────────────────────
 * v1: top 2 fuels + top 2 drains (matches this file)
 * v2: simplified to top 1 + top 1, based on known-branch-flows.html's
 *     2-blob pattern-detected screen
 * v3 (current): reverted to top 2 + top 2, after known-full-flow.html's
 *     "Anchored pairs"-equivalent Energy report section was found to show
 *     4 distinct items (2 fuel, 2 drain), not 2.
 *
 * Current understanding: these aren't contradictory designs, they're two
 * different screens showing different levels of detail —
 *   - Pattern-detected screen (mid-assessment): teaser, shows only the
 *     single top fuel + top drain (topFuels[0] / topDrains[0])
 *   - Full report: complete picture, shows all of topFuels + topDrains
 * If that reading turns out to be wrong and the pattern-detected screen
 * should also show 2+2, that's a UI-layer change, not a scoring change —
 * this file already computes everything needed either way.
 *
 * ── WHY 6 CATEGORIES, NOT 3 ──────────────────────────────────────────────
 * SDT gives you 3 core needs: Autonomy, Competence, Relatedness. Each is
 * split into a fuel-framed item set and a drain-framed item set (6
 * categories total), so there are 3 real fuel candidates and 3 real
 * drain candidates to rank.
 *
 * Each item is written in one direction only (does X energize you / does
 * X drain you) — no reverse-scoring needed, unlike Relationships.
 *
 * ── LABELS ────────────────────────────────────────────────────────────────
 * CATEGORY_LABELS are confirmed, in-voice copy: "Having a say", "Feeling
 * boxed in", "Making real progress", "Feeling stuck", "Real connection",
 * "Feeling unseen". known-full-flow.html's energyItems array uses
 * different example labels ("Owning the approach", "Visible progress",
 * "Being micromanaged", "Working alone") for its static demo — Claude
 * Code should confirm whether those are meant to replace CATEGORY_LABELS
 * or are just illustrative placeholder text for that one example user.
 * ───────────────────────────────────────────────────────────────────────
 */

export type EnergyCategory =
  | "autonomy_fuel"
  | "autonomy_drain"
  | "competence_fuel"
  | "competence_drain"
  | "relatedness_fuel"
  | "relatedness_drain";

export interface EnergyResponse {
  questionId: string;
  category: EnergyCategory;
  value: number; // 1-5
}

export interface EnergyCategoryResult {
  category: EnergyCategory;
  label: string;
  score: number;
}

export interface EnergyResult {
  categoryScores: Record<EnergyCategory, number>;
  topFuels: EnergyCategoryResult[]; // full ranking, all 3 fuel-framed categories, highest first
  topDrains: EnergyCategoryResult[]; // full ranking, all 3 drain-framed categories, highest first
}

const FUEL_CATEGORIES: EnergyCategory[] = [
  "autonomy_fuel",
  "competence_fuel",
  "relatedness_fuel",
];

const DRAIN_CATEGORIES: EnergyCategory[] = [
  "autonomy_drain",
  "competence_drain",
  "relatedness_drain",
];

const CATEGORY_LABELS: Record<EnergyCategory, string> = {
  autonomy_fuel: "Having a say",
  autonomy_drain: "Feeling boxed in",
  competence_fuel: "Making real progress",
  competence_drain: "Feeling stuck",
  relatedness_fuel: "Real connection",
  relatedness_drain: "Feeling unseen",
};

function computeCategoryScore(
  responses: EnergyResponse[],
  category: EnergyCategory
): number {
  const items = responses.filter((r) => r.category === category);
  if (items.length === 0) return 3; // neutral default if incomplete
  return items.reduce((sum, r) => sum + r.value, 0) / items.length;
}

function rankAll(
  categoryScores: Record<EnergyCategory, number>,
  candidates: EnergyCategory[]
): EnergyCategoryResult[] {
  return candidates
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      score: categoryScores[category],
    }))
    .sort((a, b) => b.score - a.score);
}

export function scoreEnergy(responses: EnergyResponse[]): EnergyResult {
  const allCategories = [...FUEL_CATEGORIES, ...DRAIN_CATEGORIES];
  const categoryScores = allCategories.reduce((acc, category) => {
    acc[category] = computeCategoryScore(responses, category);
    return acc;
  }, {} as Record<EnergyCategory, number>);

  return {
    categoryScores,
    topFuels: rankAll(categoryScores, FUEL_CATEGORIES),
    topDrains: rankAll(categoryScores, DRAIN_CATEGORIES),
  };
}


