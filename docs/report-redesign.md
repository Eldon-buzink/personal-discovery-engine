# Report redesign: first section ("Who you are")

Status as of 2026-10-23. Everything below is on `main` locally and **not pushed**.
Both flags are off by default, so the live report is unchanged until a flag is set.

## Flags (build time, `lib/known/reportFlags.ts`)

| Flag | Who | What |
|---|---|---|
| `NEXT_PUBLIC_REPORT_FREE_CLUSTER=1` | free users on `/report` | five-blob visual (selected trait in the middle, the others around it) instead of the carousel |
| `NEXT_PUBLIC_REPORT_PAID_V2=1` | paid users on `/report`, and `/report/example` | the cluster design below |

Never set the lab flags (`LAB_ROUTES`, `LAB_CONTENT_GENERATION`, `LAB_CONTENT_ALLOW_UNPAID`) on Vercel. Lab routes (`/report/lab/*`, `/landing-options`) 404 on any Vercel deployment regardless.

## Decided design

- **Free users (1 to 5 traits):** five blobs, each in its own colour (per-trait hues, as today), the selected trait large in the middle, the others around it and breathing; names inside the blobs; card below as today (with the "Your first pattern" subtitle). No filter, no cluster names, no cluster colours, no Summary. Trade-off: a trait changes colour when the user pays.
- **Paid users:** a "Showing" menu: Overview plus the five clusters.
  - Overview, nothing selected: the five most pronounced traits as equal blobs, a tie note, then "What stands out" (the most pronounced pattern: its headline and paragraph, and an "Open …" button). No generated text.
  - Cluster, nothing selected: its six blobs; title (cluster name), "6 of your traits", lead sentence, what the group is about, which traits lean (each name a link to its card) and which sit near the middle, how to read it; the pull-apart box when a same-cluster pair fires; the evidence pill.
  - Tap a blob: it moves to the middle, the others breathe around it (names inside), and its card shows: name, "This trait is part of [cluster]" (link), quote, body, relationship insight if any, evidence pill, "Written by AI, based on your answers."
  - "← Back to …", Esc and browser Back zoom out. URL: `?view=<cluster slug|overview>&trait=<trait word slug>`.
- **Ties:** strength, then the higher score, then reveal order.
- **Cluster names:** Emotional range, Social energy, Ideas and experiences (the Openness-facet cluster), Getting along, Drive and discipline. Never Big Five names.
- **Colours (paid):** readable palette in `lib/known/blobColour.ts` (`CLUSTER_COLOURS`): dark text contrast at least 4.6 on every blob; minimum CIEDE2000 between clusters 13.3 or more under normal, protan, deutan and tritan vision. Blobs drawn at 70% so names on them read easily; no glow on text.
- **Titles:** cluster names and "What stands out" use the trait-word style (italic 600), like trait names (CLAUDE.md updated).
- **Evidence panel (option A):** multi-trait panel = two plain sentences + a blob-on-a-track row per trait, no answers, max 8; per-trait panel = "based on 4 statements", the track, the position sentence built from the trait's own end words, the two answers, the statement-count line.
- **Cards (split format, lab only so far):** `shows_up` (2 sentences) + `tradeoff` (1 sentence that must cite the answer it follows from, `tradeoff_from`, or be empty). Prompt and check in `lib/known/ring1Prompt.ts` (`buildRing1PromptSplit`) and `lib/known/ring1Card.ts` (`checkRing1SplitCard`); today's card prompt and check are unchanged. Old cached cards render as one block.
- **No generation** for the Summary or cluster content. The lab generation code (`app/report/lab/content/actions.ts`, `lib/lab/contentGeneration.ts`) is kept but off.
- **Sticky bar:** option A (full-width bottom bar). **Closing panel:** option A (contained card). Paid-finished button: "Explore your environment". Bar shows after the first trait card is seen, hides over the closing panel, never covers the picker, a dialog or the paywall. Designed in the lab only (`/report/lab/bar`); **not integrated yet**.

## Code

- `components/known/report/BlobCluster.tsx`: the blob visual (overview, centre + surround, breathing, names inside).
- `components/known/report/FreeTraitCluster.tsx`: free users' visual (same props as TraitCarousel).
- `components/known/report/PaidFirstSection.tsx`: the paid first section.
- `components/known/report/ShowingMenu.tsx`, `EvidencePanels.tsx`, `evidenceParts.tsx`.
- `lib/known/clusters.ts`: labels, slugs, lead and "about" copy. `lib/known/blobColour.ts`: colours.
- Wired in `app/report/page.tsx` and `app/report/example/ExampleReportClient.tsx`.
- Lab boards: `/report/lab/{filter,content,card,evidence,colours,bar}` (local only).

## Done and verified

- Commit "Report: no cluster line or cluster grouping for free users": live change (no flag). Free users no longer see "This trait is part of …" (showed "Openness") and the carousel no longer groups by cluster.
- With every flag off, `/report` is pixel-identical (0 pixels differ) to the build of that first commit, for 5, 12 and 30 traits at 390, 768, 1280 and 1720.
- With flags on: free view has no cluster words; tapping swaps the centre; paid design on `/report/example`: zoom in focuses Back, browser Back and Esc zoom out and return focus, the cluster link and trait links work, no horizontal scroll, no page errors at all four widths.
- `/report/sample` redirects (308) to `/report/example`; site links point to `/report/example`.

## Not verified

- The paid design on `/report` with a real paid account (tested on `/report/example` only).
- Safari, a real phone, a screen reader.
- Colour-blind check is simulated only.

## Open

- Sticky bar A and closing panel A: not yet in the real report.
- Split card format: not yet used by the real card generation (`generateRing1Copy`).
- The live branch card says "Your Assertiveness and Intellect came through strongly": internal facet names shown to users (branch suggestion copy, `lib/known/branchSuggestion.ts`).
- With `NEXT_PUBLIC_REPORT_PAID_V2` off, `/report/example` still shows "This trait is part of Openness".
- "Track this" (add to practice from a card) is not wired.
- Server-side storage for paid users: deferred (needs a table with row-level security, deletion with the account, export, privacy and terms changes).
- Copy still marked `[LAB COPY]` in production code (needs sign-off before the flags go on): the cluster "about" lines, "In this group your answers lean most clearly toward …", "… sit near the middle", "Each trait runs between two ends…", "6 of your traits", "Where two of these pull apart", the tie note, "Based on the N traits you have so far". New unmarked UI words: "Showing:", "Open [trait]", "Back to …".
- Pushing: preview branch only (`git push origin main:preview/report-lab`), never `main`, after checking Vercel Preview variables and deployment protection.
