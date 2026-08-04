# Content Roadmap — Bearing

Purpose: sequence content-plan.md and the new problem-aware cluster into a
publish schedule that reads as organic growth, not a mass-generation event.
Pacing is the primary defense against scaled-content-abuse signals — no
individual post-level fix substitutes for it.

## Why pacing matters here specifically

Google's scaled content abuse enforcement targets *volume + uniformity*
patterns, not any single piece of content. A site with 0 blog posts
publishing 20 in one week, all structurally similar, is a textbook signal —
even if every individual post is well-written and genuinely useful. Spreading
the same 20 posts across 6-8 weeks, mixed in type and category, with visible
editorial variation, is a fundamentally different signal, even though the
end state (20 posts live) is identical.

## Batch structure

Each batch = **3-4 posts**, mixing category and format so no batch reads as
a template run. Every batch pulls from more than one lane (problem-aware /
category-filling / trait-facet / comparison) rather than clearing one lane
at a time — this is deliberate, not just topic order.

Target cadence: **1 batch every 2 weeks** (roughly 1.5-2 posts/week average).
Slower than what Claude Code could physically produce — that's the point.

---

### Batch 1 (weeks 1-2) — highest priority, mixed lanes
- "Why do I feel like a different person in different situations" (problem-aware)
- "What is the Big Five personality test" (Frameworks — category-filling)
- "Why do I keep dating the same type of person" (problem-aware, Relationships)

### Batch 2 (weeks 3-4)
- "Holland Code / RIASEC explained" (Work & Direction — category-filling)
- "Big Five vs MBTI" (Frameworks, comparison)
- "Attachment style quiz" (Relationships — category-filling, needs the
  differentiated angle discussed earlier, not a standalone quiz clone)

### Batch 3 (weeks 5-6)
- "Why am I unhappy at my job even though I'm successful" (problem-aware —
  validate via search first, per content-plan.md process)
- "IPIP-NEO-120 explained" (Frameworks, low competition)
- "ECR-R questionnaire explained" (Relationships, low competition)
- Next 1-2 trait-facet posts (pull from the actual facet list in the
  assessment's scoring logic, not re-derived)

### Batch 4 (weeks 7-8)
- "Why do I people-please / why can't I say no" (problem-aware, links to
  existing Modesty post)
- "Why can't I stick to a routine" (problem-aware, links to existing
  Cautiousness post)
- "Ideal work environment quiz" (Work & Direction)
- MBTI alternative / "personality test that gives you a plan" (comparison)

### Batch 5+ (ongoing, week 9+)
- Continue trait-facet posts at a steady trickle (1-2 per batch)
- Revisit content-plan.md validated/unvalidated queue, keep validating
  before drafting
- By this point, check GSC's Search Generative AI Performance report and
  actual indexing/ranking data to weight future batches toward what's
  actually working rather than the original guesses

---

## Review gate (applies to every batch, no exceptions)

Before any batch goes from drafted → published:
1. Human read-through of all posts in the batch — not a skim, an actual edit
   pass (per SEO_GEO.md content quality standards)
2. Confirm structural variety within the batch — no two posts in the same
   batch should share an identical heading skeleton
3. Confirm each post has at least one Bearing-specific detail a template
   couldn't produce (real example, real product tie-in, specific scenario)
4. Stagger publish dates within the batch — don't publish all 3-4 on the
   same day even if they're approved together. Spread across the 2-week
   window (e.g. day 1, day 5, day 10)

## Instructions for Claude Code

When asking Claude Code to draft a batch, be explicit about scope and
pacing so it doesn't over-deliver:

```
Draft Batch [N] from content-roadmap.md — exactly the [3-4] posts listed,
no more. Follow SEO_GEO.md content quality standards for each post
(originality checklist, GEO formatting, structural variety within the
batch specifically — vary heading structure and format across these
[3-4] posts, don't reuse the same skeleton).

Do not draft posts from future batches even if you have capacity — the
roadmap's pacing is deliberate, not a backlog to clear quickly.

For each post, confirm before marking done:
- Passes the originality/value-add checklist in SEO_GEO.md
- Includes real product tie-in specific to Bearing (not generic advice
  that could apply to any personality-test brand)
- FAQ schema included where applicable
- Internal links use specific anchor text, not generic phrasing

Output drafts for my review — do not auto-publish. I'll confirm publish
dates individually per the staggered schedule.
```

## Status tracking

Update this table as batches move through the pipeline:

| Batch | Status | Drafted | Reviewed | Published (dates) |
|---|---|---|---|---|
| 1 | In progress | Done | Done | different-person-different-situations: 2026-08-04 (live). dating-the-same-type-of-person: 2026-08-09 (scheduled via publishDate). what-is-the-big-five-personality-test: 2026-08-14 (scheduled via publishDate). |
| 2 | Not started | | | |
| 3 | Not started | | | |
| 4 | Not started | | | |
