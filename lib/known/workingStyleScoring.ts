/**
 * lib/known/workingStyleScoring.ts
 *
 * ── WHAT THIS DOES ──────────────────────────────────────────────────────
 * Scores the Your Working Style branch (Big Five conscientiousness/
 * agreeableness facets, adapted into 3 independent bipolar axes; 21 items,
 * 7 per axis) and returns a continuous 0-1 position per axis — not a
 * discrete label, per reference/branch-question-specs.md.
 *
 * ── POSITION CONVENTION ───────────────────────────────────────────────────
 * position 0   = fully the axis's first-named pole (Structured / Independent / Direct)
 * position 1   = fully the axis's second-named pole (Flexible / Collaborative / Diplomatic)
 * Every axis's non-reversed items are worded toward the first-named pole (e.g.
 * "I like having a clear plan before I start something" = Structured), so a
 * high raw average (agreement) means LOW position (close to the first pole).
 * position = (5 - rawAverage) / 4, after reverse-scoring (6 - raw) is applied
 * to items flagged reverse.
 *
 * ── WHY NOT A DISCRETE LABEL ──────────────────────────────────────────────
 * Unlike Ring 1's high/mid/low split, an axis position is inherently a
 * spectrum — the report visual places a dot along a line, not in a bucket.
 * `leaningLabel` below is only for display text (blob word, teaser copy)
 * and just reflects which side of the midpoint (0.5) the position falls on.
 * ───────────────────────────────────────────────────────────────────────
 */

export type WorkingStyleAxis = "structure" | "independence" | "directness";

export interface WorkingStyleResponse {
  questionId: string;
  axis: WorkingStyleAxis;
  value: number; // 1-5 raw response
  reverse: boolean;
}

export const AXIS_POLES: Record<WorkingStyleAxis, { left: string; right: string }> = {
  structure:     { left: "Structured",  right: "Flexible" },
  independence:  { left: "Independent", right: "Collaborative" },
  directness:    { left: "Direct",      right: "Diplomatic" },
};

export interface WorkingStyleAxisResult {
  axis: WorkingStyleAxis;
  position: number; // 0-1, see convention above
  leaningLabel: string; // AXIS_POLES[axis].left or .right, whichever position is closer to
}

export interface WorkingStyleResult {
  axes: Record<WorkingStyleAxis, WorkingStyleAxisResult>;
}

const AXES: WorkingStyleAxis[] = ["structure", "independence", "directness"];

function scoreAxis(responses: WorkingStyleResponse[], axis: WorkingStyleAxis): WorkingStyleAxisResult {
  const items = responses.filter((r) => r.axis === axis);
  const rawAverage =
    items.length === 0
      ? 3 // neutral default if this axis hasn't been answered yet (mid-branch reveals)
      : items.reduce((sum, r) => sum + (r.reverse ? 6 - r.value : r.value), 0) / items.length;

  const position = (5 - rawAverage) / 4;
  const poles = AXIS_POLES[axis];
  const leaningLabel = position < 0.5 ? poles.left : poles.right;

  return { axis, position, leaningLabel };
}

export function scoreWorkingStyle(responses: WorkingStyleResponse[]): WorkingStyleResult {
  const axes = AXES.reduce((acc, axis) => {
    acc[axis] = scoreAxis(responses, axis);
    return acc;
  }, {} as Record<WorkingStyleAxis, WorkingStyleAxisResult>);

  return { axes };
}
