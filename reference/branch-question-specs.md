# Branch Question Specs

Source of truth for branch question sets, dimension tagging, and reverse-scoring flags. Each branch section should be confirmed (reverse-scoring verified against item wording, dimension balance checked) before being wired into the build — same process used for Your Relationships below.

---

## Your Relationships

**Framework:** ECR-R (Experiences in Close Relationships – Revised), adapted
**Items:** 15
**Dimensions:** Anxiety (7 items), Avoidance (8 items)
**Scale:** 1–5, "Strongly disagree" to "Strongly agree"
**Output:** Anxiety score + Avoidance score → one of four quadrant words (Open, Independent, Attached, Cautious). See `lib/known/relationshipsScoring.ts` for the scoring model, midpoint split, and partner-distance visual mapping.

| # | Question | Dimension | Reverse |
|---|---|---|---|
| 1 | I find it easy to trust people I've just met. | avoidance | yes |
| 2 | When I'm upset, I tend to work through it alone before talking to someone. | avoidance | no |
| 3 | I worry about whether the people close to me really understand me. | anxiety | no |
| 4 | I'm comfortable depending on others when I need to. | avoidance | yes |
| 5 | I find it hard to open up to someone until I've known them for a long time. | avoidance | no |
| 6 | I notice when the people I care about seem distant, even when they say nothing is wrong. | anxiety | no |
| 7 | I would rather handle a difficult situation alone than ask for help. | avoidance | no |
| 8 | I find it easy to show affection to the people I'm close to. | avoidance | yes |
| 9 | I sometimes worry that I care more about relationships than others care about them. | anxiety | no |
| 10 | When someone lets me down, I find it hard to go back to how things were before. | anxiety | no |
| 11 | I prefer to keep some emotional distance, even in close relationships. | avoidance | no |
| 12 | I rarely worry about whether the people I care about will be there when I need them. | anxiety | yes |
| 13 | I find it uncomfortable when someone relies on me emotionally. | avoidance | no |
| 14 | I often feel like the people around me don't need me as much as I need them. | anxiety | no |
| 15 | I often find myself seeking reassurance that the people close to me still care. | anxiety | no |

**Reverse-scoring note:** for items flagged `reverse: yes`, agreement (high raw score) indicates the *low* end of that dimension. Apply `6 - raw_value` before averaging, consistent with the Ring 1 reverse-scoring pattern in `lib/known/scoring.ts`.

**Known open flag:** the quadrant split uses a 3.0 midpoint on both axes (see scoring file comment block). ECR-R population norms for avoidance typically skew lower in non-clinical samples (~2.4–2.8 average), which could under-populate the Independent/Cautious quadrants. Revisit the split point once real response data comes in.

---

## Your Energy

*Not yet specified. Framework: SDT autonomy/relatedness/competence as fuels/drains. 15 items. To be drafted and confirmed following the same process as above before building.*

---

## Your Working Style

*Not yet specified. Framework: Big Five conscientiousness/agreeableness facets. 15 items. To be drafted and confirmed following the same process as above before building.*

---

## Your Direction

*Not yet specified. Framework: Holland Codes (RIASEC), adapted. 15 items. To be drafted and confirmed following the same process as above before building.*
