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

**Framework:** SDT (Self-Determination Theory), adapted — Autonomy, Competence, Relatedness, each split into a fuel-framed and drain-framed item set (6 categories total)
**Items:** 24 (4 per category — bumped up from an initial 15/3-or-2-per-category draft for better reliability; drain categories in particular were only 2 items each, thinner than even Working Style's original under-strength 5-per-axis draft)
**Scale:** 1–5, "Strongly disagree" to "Strongly agree"
**Output:** Full ranking of all 3 fuel-framed categories + all 3 drain-framed categories. Pattern-detected screen (mid-assessment) shows only the top-ranked fuel + top-ranked drain as a teaser. Full report shows all 3 fuels and all 3 drains, ranked, with the top fuel/drain carrying richer AI-generated narrative. See `lib/known/energyScoring.ts` for the scoring model and category ranking logic.

**Why 6 categories, not 3:** SDT gives 3 core needs, but distinguishing "what fuels you" from "what drains you" needs two independent rankings — splitting each need into a fuel-framed and drain-framed item set gives 3 real fuel candidates and 3 real drain candidates to rank, rather than forcing two readings out of one bipolar score per need.

**Reveal vs. report distinction (confirmed against reference files):** `known-branch-flows.html`'s pattern-detected screen hardcodes a single fuel word + single drain word (teaser). `known-full-flow.html`'s full report shows the complete ranked picture. These aren't contradictory — they're two screens at two different levels of detail.

| # | Question | Category |
|---|---|---|
| 1 | I feel most energized when I get to decide how to do something myself. | autonomy_fuel |
| 2 | Having room to do things my own way gives me a real boost. | autonomy_fuel |
| 3 | I feel more alive when I'm trusted to make my own calls. | autonomy_fuel |
| 4 | Getting to choose how I tackle something matters more to me than people realize. | autonomy_fuel |
| 5 | Being told exactly how to do something, step by step, wears me down. | autonomy_drain |
| 6 | I feel drained when I have no say in decisions that affect me. | autonomy_drain |
| 7 | I feel my energy drain when someone changes my approach without asking me first. | autonomy_drain |
| 8 | Not having a say in how something gets done is exhausting, even when I don't mind the outcome. | autonomy_drain |
| 9 | Getting better at something difficult gives me a real lift. | competence_fuel |
| 10 | I feel energized after making visible progress on something that matters to me. | competence_fuel |
| 11 | Solving a hard problem leaves me feeling more energized, not less. | competence_fuel |
| 12 | There's a real lift I get from seeing something I built actually work. | competence_fuel |
| 13 | Feeling incompetent at something drains me quickly. | competence_drain |
| 14 | Being stuck without progress wears me down over time. | competence_drain |
| 15 | Repeating the same mistake wears me down more than the mistake itself. | competence_drain |
| 16 | Not knowing if I'm doing something right saps my energy fast. | competence_drain |
| 17 | Time spent with people I feel close to leaves me feeling recharged. | relatedness_fuel |
| 18 | A real conversation, not small talk, gives me energy. | relatedness_fuel |
| 19 | Feeling understood by someone leaves me lighter, not heavier. | relatedness_fuel |
| 20 | Being fully seen by someone, even briefly, gives me a noticeable lift. | relatedness_fuel |
| 21 | Being around people without any real connection drains me, even if the interaction is pleasant. | relatedness_drain |
| 22 | Feeling isolated wears me down faster than almost anything else. | relatedness_drain |
| 23 | Small talk that never turns into anything real leaves me feeling flat. | relatedness_drain |
| 24 | Being around people who don't really know me is quietly draining, even if they're nice. | relatedness_drain |

**Category labels:** confirmed, in-voice — "Having a say", "Feeling boxed in", "Making real progress", "Feeling stuck", "Real connection", "Feeling unseen" (`CATEGORY_LABELS` in `energyScoring.ts`). `known-full-flow.html`'s example labels ("Owning the approach," "Visible progress," etc.) were confirmed to be illustrative placeholder text for that file's one demo persona, not a replacement label set — three separate reference points (mid-assessment teaser, full-flow demo, and this spec) each use their own vocabulary, none of which is meant to override another.

**Copy generation architecture:** one combined `generatePatternCopy` call at branch completion, requesting narrative for all 4 surfaced items (top fuel, 2nd fuel, top drain, 2nd drain) in one JSON response — not 4 separate calls. Chosen so the model can relate ranked items to each other (e.g., how close the top and 2nd-ranked fuel are) and to stay consistent with the "generate once, store forever" pattern used everywhere else in the product.

---

## Your Working Style

**Framework:** Big Five conscientiousness/agreeableness facets, adapted into 3 independent bipolar axes
**Items:** 21 (7 per axis — bumped up from an initial 15/5-per-axis draft for better reliability; 5 items per axis was thin enough that a single atypical answer could swing ~20% of an axis score)
**Axes:** Structure (Structured ↔ Flexible), Independence (Independent ↔ Collaborative), Directness (Direct ↔ Diplomatic)
**Scale:** 1–5, "Strongly disagree" to "Strongly agree"
**Output:** A continuous 0–1 position per axis (not a discrete label) — see `lib/known/workingStyleScoring.ts`. No code changes were needed to support the larger item count; the scoring function averages whatever responses are tagged to each axis.

| # | Question | Axis | Reverse |
|---|---|---|---|
| 1 | I like having a clear plan before I start something. | structure | no |
| 2 | I prefer to figure things out as I go rather than plan every step. | structure | yes |
| 3 | Unexpected changes to a plan bother me more than they seem to bother others. | structure | no |
| 4 | I do my best work when there's room to improvise. | structure | yes |
| 5 | I like knowing exactly what's expected before I begin. | structure | no |
| 6 | I do my best thinking on my own, not in a group. | independence | no |
| 7 | I'd rather bounce ideas off others than work them out alone. | independence | yes |
| 8 | I prefer to own a piece of work fully rather than share responsibility for it. | independence | no |
| 9 | Working through a problem with someone else usually gets me to a better answer than working alone. | independence | yes |
| 10 | I get more done when I'm left to work independently. | independence | no |
| 11 | I'd rather say something honest and blunt than soften it. | directness | no |
| 12 | I choose my words carefully so I don't come across as harsh. | directness | yes |
| 13 | People sometimes tell me I'm too blunt. | directness | no |
| 14 | I'll hold back a critical opinion if the timing doesn't feel right. | directness | yes |
| 15 | I say what I think, even if it's not what people want to hear. | directness | no |
| 16 | I make lists or schedules to keep myself on track. | structure | no |
| 17 | I get bored quickly if a routine feels too rigid. | structure | yes |
| 18 | I'd rather ask for input early than risk going too far in the wrong direction alone. | independence | yes |
| 19 | Given the choice, I'll pick the solo assignment over the group one. | independence | no |
| 20 | If feedback is going to sting, I'd still rather give it straight. | directness | no |
| 21 | I read the room before deciding how much to say. | directness | yes |

**Pattern-detected reveal:** confirmed against `known-branch-flows.html` — reveals per axis (one at a time, matching the "one of three axes" copy), not a combined reveal. Visual needs more presence than the reference's plain word+line (flagged for more color/texture, matching other branches' blob-based reveals) — pending Claude Code follow-up.

**Report visual:** confirmed richer than initially assumed — "Anchored pairs" section in `known-full-flow.html` shows all 3 axes with distinct colors, analysis copy that may reference other completed branches, and a tap interaction per axis. Details (exact colors, static vs. dynamic copy, what tapping reveals) pending investigation — do not build the report section until that comes back.

**Known limitation:** even at 7 items per axis, this is a custom-written adapted scale, not a validated instrument — reliability is improved over the original 15-item draft but still short of something like NEO-PI-R facet scales (~8 items each with established psychometric validation).

---

## Your Direction

**Framework:** Holland Codes (RIASEC), adapted
**Items:** 24 (4 per type — drafted at this density from the start, following the reliability lesson learned from Working Style and Energy, rather than shipping the original 15-item spec and reworking later)
**Types:** Realistic, Investigative, Artistic, Social, Enterprising, Conventional
**Scale:** 1–5, "Strongly disagree" to "Strongly agree"
**Output:** Full ranking of all 6 types (highest score first). See `lib/known/directionScoring.ts`. Scoring intentionally does NOT truncate to "top 3" internally — that cutoff is a UI decision, not a scoring decision, per the lesson learned from Energy's top-1/top-2 rework.

No reverse-scoring — items are single-direction interest statements ("I like X"), same approach as Energy, not a bipolar scale like Relationships or Working Style.

| # | Question | Type |
|---|---|---|
| 1 | I'd rather build or fix something with my hands than talk about how to build or fix it. | realistic |
| 2 | I like tasks where I can see a physical result at the end. | realistic |
| 3 | I'm drawn to work that involves tools, machines, or physical materials. | realistic |
| 4 | I enjoy figuring out how something works by taking it apart. | realistic |
| 5 | I like digging into a problem until I really understand why it happens. | investigative |
| 6 | I'm drawn to questions that don't have an obvious answer yet. | investigative |
| 7 | I enjoy research — reading, testing, comparing — more than most people I know. | investigative |
| 8 | Understanding the "why" behind something matters more to me than just knowing what to do. | investigative |
| 9 | I need creative freedom in my work, not just a set of instructions to follow. | artistic |
| 10 | I'm happiest when I'm making something that didn't exist before. | artistic |
| 11 | I get more out of an unconventional idea than a proven, safe one. | artistic |
| 12 | Self-expression is something I actively look for in what I do. | artistic |
| 13 | Helping someone grow or improve is genuinely satisfying to me. | social |
| 14 | I naturally gravitate toward the person in the room who needs support. | social |
| 15 | I'd rather teach someone a skill than just do the task myself. | social |
| 16 | Conversations about people's lives interest me more than conversations about systems or things. | social |
| 17 | I like convincing people to see things my way. | enterprising |
| 18 | Taking the lead on a project feels natural to me. | enterprising |
| 19 | I'm energized by pitching an idea and getting others on board. | enterprising |
| 20 | I enjoy the competitive side of getting a deal or opportunity to work out. | enterprising |
| 21 | I like creating order out of a messy set of information. | conventional |
| 22 | Keeping accurate records and details straight is something I'm good at and enjoy. | conventional |
| 23 | I feel satisfaction from a well-organized system running smoothly. | conventional |
| 24 | I'd rather follow a clear, proven process than improvise one. | conventional |

**Type labels:** draft placeholders in `directionScoring.ts` ("Making things work", "Figuring things out", etc.) — confirm against `known-branch-flows.html` and `known-full-flow.html`'s "YOUR DIRECTION" sections before shipping, same verification process used for every prior branch's labels.

**Open design question:** how the pattern-detected reveal and report display work for a 6-category ranking ("top 3 of 6") hasn't been resolved yet — doesn't map cleanly onto any reveal pattern used so far (Relationships' quadrant, Energy's top-1-then-full-ranking, Working Style's 3 independent axes). Needs verification against the real reference files before building, same process used for every prior branch.
