/**
 * lib/known/directionScoring.ts
 *
 * ── WHAT THIS DOES ──────────────────────────────────────────────────────
 * Scores the Your Direction branch (Holland Codes / RIASEC, adapted,
 * 24 items) and returns a full ranking of all 6 types.
 *
 * ── WHY 24 ITEMS, NOT 15 ──────────────────────────────────────────────────
 * The original handover spec called for 15 items. Across 6 RIASEC
 * categories that's 2.5 items each — thinner than Working Style's
 * original 15-item draft (5 per axis, already flagged as too thin and
 * bumped to 21) and thinner than Energy's original draft (bumped to 24
 * for the same reason). Drafted at 24 (4 per category) from the start
 * rather than shipping thin and reworking later.
 *
 * ── WHY RETURN THE FULL RANKING, NOT A TRUNCATED "TOP 3" ─────────────────
 * Energy's scoring file originally truncated to "top 1" internally, which
 * turned out to not match the real report design (which needed all
 * ranked items) — the fix required restoring the full ranking and moving
 * the cutoff decision to the UI layer. Applying that lesson here from the
 * start: this file always returns all 6 types ranked; how many the
 * pattern-detected screen or report actually display is a UI decision,
 * not baked in here.
 *
 * No reverse-scoring — items are single-direction interest statements
 * ("I like X"), same approach as Energy, not a bipolar scale like
 * Relationships or Working Style.
 *
 * ── LABELS ────────────────────────────────────────────────────────────────
 * TYPE_LABELS are draft, in-voice plain-language names for each RIASEC
 * type (not the clinical RIASEC letters/names) — check against
 * known-branch-flows.html and known-full-flow.html's "YOUR DIRECTION"
 * sections before treating these as final, same verification process
 * used for every other branch's labels.
 * ───────────────────────────────────────────────────────────────────────
 */

export type DirectionType =
  | "realistic"
  | "investigative"
  | "artistic"
  | "social"
  | "enterprising"
  | "conventional";

export interface DirectionResponse {
  questionId: string;
  type: DirectionType;
  value: number; // 1-5
}

export interface DirectionTypeResult {
  type: DirectionType;
  label: string;
  score: number;
}

export interface DirectionResult {
  categoryScores: Record<DirectionType, number>;
  ranked: DirectionTypeResult[]; // all 6 types, highest score first
}

export interface ShownDirection extends DirectionTypeResult {
  tier: "Closest match" | "Worth exploring";
}

// Tuning knob: how close a lower-ranked type's score needs to be to the
// previous one to still count as a genuine contender, not just "whatever
// was left." Matches the same confidence-margin approach used in
// branchSuggestion.ts. Adjust after watching real usage.
const CONTENDER_GAP = 0.5;

/**
 * Selects 1-3 directions to actually surface in the UI, per the reference
 * intro copy ("you'll see two or three directions") — not always exactly
 * 3. Rank 1 always shows. Ranks 2 and 3 only show if they're close enough
 * to the previous one to be a real contender, not just filling a slot.
 */
export function selectShownDirections(ranked: DirectionTypeResult[]): ShownDirection[] {
  if (ranked.length === 0) return [];

  const shown: ShownDirection[] = [{ ...ranked[0], tier: "Closest match" }];

  for (let i = 1; i < Math.min(3, ranked.length); i++) {
    const gap = shown[shown.length - 1].score - ranked[i].score;
    if (gap <= CONTENDER_GAP) {
      shown.push({ ...ranked[i], tier: "Worth exploring" });
    } else {
      break; // gap too large — remaining types aren't close contenders
    }
  }

  return shown;
}

const ALL_TYPES: DirectionType[] = [
  "realistic",
  "investigative",
  "artistic",
  "social",
  "enterprising",
  "conventional",
];

// Draft labels — confirm against reference files before shipping.
const TYPE_LABELS: Record<DirectionType, string> = {
  realistic: "Making things work",
  investigative: "Figuring things out",
  artistic: "Making something original",
  social: "Helping people grow",
  enterprising: "Making things happen",
  conventional: "Keeping things organized",
};

function computeTypeScore(
  responses: DirectionResponse[],
  type: DirectionType
): number {
  const items = responses.filter((r) => r.type === type);
  if (items.length === 0) return 3; // neutral default if incomplete
  return items.reduce((sum, r) => sum + r.value, 0) / items.length;
}

export function scoreDirection(responses: DirectionResponse[]): DirectionResult {
  const categoryScores = ALL_TYPES.reduce((acc, type) => {
    acc[type] = computeTypeScore(responses, type);
    return acc;
  }, {} as Record<DirectionType, number>);

  const ranked = ALL_TYPES
    .map((type) => ({
      type,
      label: TYPE_LABELS[type],
      score: categoryScores[type],
    }))
    .sort((a, b) => b.score - a.score);

  return { categoryScores, ranked };
}
