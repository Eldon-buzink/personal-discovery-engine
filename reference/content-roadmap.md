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
| 1 | Done | Done | Done | different-person-different-situations: 2026-08-04 (live). dating-the-same-type-of-person: 2026-08-09 (live). what-is-the-big-five-personality-test: 2026-08-14 (live). |
| 2 | In progress | Done | Skipped (published on request, no human read-through pass logged) | holland-code-riasec-explained: 2026-08-19 (scheduled via publishDate). big-five-vs-mbti: 2026-08-24 (scheduled via publishDate). attachment-style-quiz: 2026-08-29 (scheduled via publishDate). |
| 3 | Published (redefined, staggered) | Done | Product-first/traceability check by Claude Code (2026-08-25) — each claim tied to Bearing's scoring logic checked against the actual source (generatePatternCopy.ts, energyScoring.ts, directionScoring.ts); user approved publish on that basis. Not a full manual line-edit pass. | ecr-r-questionnaire-explained: 2026-08-25 (live). why-unhappy-successful-job: 2026-08-30 (scheduled via publishDate). why-ambitious-people-cant-name-what-they-want: 2026-09-04 (scheduled via publishDate) — new audience-specific post, swapped in for ipip-neo-120-explained. ipip-neo-120-explained, self-efficacy, achievement-striving remain `published: false`, no publishDate set — not part of this batch. |
| 4 | Drafted, awaiting review | Done | Not started | people-pleasing-cant-say-no, cant-stick-to-a-routine, ideal-work-environment-quiz, personality-test-that-gives-you-a-plan — all `published: false`, no publishDate set. |
| 5 | Partially drafted | Partial | Not started | gregariousness, intellect drafted as the trait-facet trickle (`published: false`). The rest of Batch 5 (revisiting the content-plan.md queue, weighting by GSC Search Generative AI Performance data) couldn't be done — `content-plan.md` doesn't exist in the repo, and Claude Code has no GSC access. Topic selection beyond the two trait posts needs a human call. |

**Note on process deviations (2026-08-19):** Batches 2–5 were drafted in the same session at the user's explicit request, overriding this doc's "do not draft future batches" pacing rule — a one-time exception, not a change to the standing rule. Batch 2 was also published without the human read-through pass this doc calls for as a review-gate step; flagging here so it isn't mistaken for having happened.

**Note on process deviations (2026-08-25):** Batch 3 as actually published differs from the original roadmap entry above — ipip-neo-120-explained was dropped in favor of a new audience-specific post (why-ambitious-people-cant-name-what-they-want) not previously on the roadmap, chosen for its own product-first mechanic (Achievement-Striving vs. Direction) rather than being drawn from the validated queue. Search demand for the job-satisfaction post was validated via live web search before publish, closing a gap flagged in Batch 5's row below. Review was a targeted product-first/traceability check, not the full manual edit pass this doc's review gate describes — flagging here for the same reason as the Batch 2 note.
