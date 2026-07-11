/**
 * lib/known/relationshipsScoring.ts
 *
 * ── WHAT THIS DOES ──────────────────────────────────────────────────────
 * Scores the Your Relationships branch (ECR-R adapted, 15 items) across
 * two dimensions — Anxiety and Avoidance — and maps the result to one of
 * four plain-language quadrant words. Also derives the visual "distance"
 * value used by the report's two-circle (You + Partner) visual.
 *
 * ── QUADRANT MODEL ───────────────────────────────────────────────────────
 * Unlike single-facet reveals elsewhere (which use a high/mid/low split
 * at 3.5/2.5), a quadrant needs every user to land in exactly one of four
 * boxes — there's no "mid" quadrant. So this uses the scale midpoint (3.0)
 * as the split point on both axes:
 *
 *                    low avoidance      high avoidance
 *   low anxiety   →     Open              Independent
 *   high anxiety  →     Attached          Cautious
 *
 * This is a deliberate deviation from the tri-state threshold used
 * elsewhere in the product — flag back to Eldon if real response data
 * suggests the midpoint split clusters unevenly (e.g. most users landing
 * in one or two quadrants), since that would need a different split point
 * or a non-linear mapping instead of a hard 3.0 cutoff.
 *
 * ── VISUAL DISTANCE ──────────────────────────────────────────────────────
 * The report shows two circles (You + Partner) connected by a dotted
 * line; the gap between them scales with the Avoidance score. This does
 * NOT use the quadrant split — it's a continuous value so the visual
 * feels proportional rather than snapping between two fixed states.
 *
 * ── WHAT'S STILL NEEDED FROM THE REAL QUESTION SPEC ─────────────────────
 * This file assumes each response is tagged with which dimension
 * (anxiety | avoidance) it belongs to, and whether it's reverse-scored.
 * That tagging must match whatever's defined in
 * reference/branch-question-specs.md — Claude Code should verify the
 * question data structure lines up with `RelationshipsResponse` below
 * before wiring this in, the same way the facet-name audit was done for
 * branchSuggestion.ts.
 * ───────────────────────────────────────────────────────────────────────
 */

export type RelationshipsDimension = "anxiety" | "avoidance";

export type RelationshipsQuadrant =
  | "Open"
  | "Independent"
  | "Attached"
  | "Cautious";

export interface RelationshipsResponse {
  questionId: string;
  dimension: RelationshipsDimension;
  value: number; // 1-5 raw response
  reverse: boolean; // whether this item is reverse-scored
}

export interface RelationshipsResult {
  anxietyScore: number; // 1-5 average
  avoidanceScore: number; // 1-5 average
  quadrant: RelationshipsQuadrant;
  partnerDistance: number; // 0-1 normalized, for the visual to scale into px/%
}

const SCALE_MIDPOINT = 3.0;
const SCALE_MIN = 1;
const SCALE_MAX = 5;

function reverseScore(value: number): number {
  return SCALE_MAX + SCALE_MIN - value;
}

function computeDimensionScore(
  responses: RelationshipsResponse[],
  dimension: RelationshipsDimension
): number {
  const items = responses.filter((r) => r.dimension === dimension);
  if (items.length === 0) return SCALE_MIDPOINT; // neutral default if incomplete

  const total = items.reduce((sum, r) => {
    const scored = r.reverse ? reverseScore(r.value) : r.value;
    return sum + scored;
  }, 0);

  return total / items.length;
}

function getQuadrant(
  anxietyScore: number,
  avoidanceScore: number
): RelationshipsQuadrant {
  const highAnxiety = anxietyScore > SCALE_MIDPOINT;
  const highAvoidance = avoidanceScore > SCALE_MIDPOINT;

  if (!highAnxiety && !highAvoidance) return "Open";
  if (!highAnxiety && highAvoidance) return "Independent";
  if (highAnxiety && !highAvoidance) return "Attached";
  return "Cautious";
}

/**
 * Maps avoidance score (1-5) to a normalized 0-1 distance value.
 * 0 = circles close together (low avoidance), 1 = circles far apart
 * (high avoidance). The report visual should scale this into its own
 * px/% range rather than hardcoding pixel values here.
 */
function getPartnerDistance(avoidanceScore: number): number {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, avoidanceScore));
  return (clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN);
}

export function scoreRelationships(
  responses: RelationshipsResponse[]
): RelationshipsResult {
  const anxietyScore = computeDimensionScore(responses, "anxiety");
  const avoidanceScore = computeDimensionScore(responses, "avoidance");

  return {
    anxietyScore,
    avoidanceScore,
    quadrant: getQuadrant(anxietyScore, avoidanceScore),
    partnerDistance: getPartnerDistance(avoidanceScore),
  };
}
