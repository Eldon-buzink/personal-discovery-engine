# Data flow: generated report text

What leaves our server when Bearing writes a trait card with a language model,
and what doesn't. Verified on 2026-10-13 by pointing the app's model endpoint
at a local capture server and running a real first reveal with known test
identifiers planted in the browser (none of them appeared in the request).

## Ring 1 trait cards (`generateRing1Copy`, app/actions/generatePatternCopy.ts)

**Browser → our server** (server action arguments, all validated server-side
in `lib/server/patternCopyInput.ts`):
- facet name, trait word, score direction (high / mid / low)
- `assessmentId` — checked, then not used for generation
- this facet's answers as question ids and values (1–5) — not item text.
  Not sent for facets in `RING1_EVIDENCE_EXCLUDED_FACETS`
  (`lib/known/ring1Evidence.ts`, default: Depression), and never the
  single items in `RING1_EVIDENCE_EXCLUDED_ITEMS`:

  | Item | Text | Facet | Why |
  |---|---|---|---|
  | 69 | Tend to vote for liberal political candidates. | Liberalism | political opinion |
  | 71 | Tend toward liberal political views. | Liberalism | political opinion |
  | 72 | Believe in one true religion. | Liberalism | religious belief |

  Political opinions and religious beliefs are sensitive data, and the card
  describes questioning traditions, not politics or faith. These items still
  count in the facet score, which the browser computes from all answers; only
  their answers are kept out of the request. The prompts also forbid
  mentioning religion, faith, politics, parties, voting or sexuality.

**Our server → Anthropic** (one `POST /v1/messages` per attempt, at most two):
- Body: `model`, `max_tokens`, `system` (fixed text), `output_config` (fixed
  JSON schema), and one user message containing:
  - the facet name, a fixed description of what it measures, the score
    direction wording and the trait word
  - up to two of the person's most strongly held answers on that facet:
    the item text (from our own question list) and whether they agreed or
    disagreed — omitted for excluded facets
  - fixed rules and examples
- Headers: API key, `anthropic-version`, and the SDK's own client info
  (SDK version, OS, CPU architecture, Node version).

**Not sent:** name, email, user id, account or session ids (`assessmentId`,
mini-assessment session id, anonymous id), IP address (the request comes from
our server, not the visitor's browser), answers to other facets, the request's
`metadata` field.

**Stored:** nothing server-side. The returned card is kept only in the
browser's `known_session`. A failed generation is not stored at all.

**Logged:** only the error kind and HTTP status on failure (never the error
message, which can quote request or response text), and fixed validation
reasons ("tag over 3 words"). No item text or answer values.

## Relationship insights (`generateRelationshipInsight`)

Short notes on a Ring 1 card about how several of the person's revealed traits
relate (lib/known/relationshipDefinitions.ts). Verified the same way on
2026-10-13 with the local capture server.

**Browser → our server:** the relationship id and, for each contributing
trait, the facet name, its direction (high or low) and its trait word. All
checked server-side (`lib/server/relationshipInput.ts`): the relationship
must fire from exactly those signals, and each trait word must be the
facet's real word for that direction.

**Our server → Anthropic** (one `POST /v1/messages` per attempt, at most two):
- Body: `model` (Sonnet 5.5), `max_tokens`, `system` (fixed text), `temperature`
  (only for models that accept it, so not Sonnet 5.5), `output_config` (fixed schema), and one user message with the
  relationship's fixed description (what it tends to give and cost, or the
  tension line), each contributing facet's name, direction, trait word and
  fixed behavioural description, plus fixed rules and examples.
- Headers: as for Ring 1 cards.

**Not sent:** any answers or item text (not even for the facets involved),
name, email, user id, account or session ids, IP address, the free-reveal
cookie.

**Stored:** only in the browser, in `known_session.relationshipInsights`
(relationship id, the facet:direction signature, the text). Failures are
never stored. An attempt counter per signature lives in `sessionStorage`
(`known_relationship_insight_attempts`).

**Logged:** error kind / HTTP status, or a fixed rejection reason ("sentence
too long"). Never the text.

## Branch cards (`generatePatternCopy`)

Branch name, the result labels and scores (e.g. "Having a say", 4.2 of 5) and
fixed context text. No item text, no answers, no identifiers. Same logging rule.

## Related, not sent to Anthropic

The rate limiter (`lib/server/rateLimit.ts`) stores a key in our Supabase
database: the signed-in user's id, or a salted hash of the IP address for
anonymous visitors. It never goes to the model provider.
