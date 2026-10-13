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
  (`lib/known/ring1Evidence.ts`, default: Depression)

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

## Branch cards (`generatePatternCopy`)

Branch name, the result labels and scores (e.g. "Having a say", 4.2 of 5) and
fixed context text. No item text, no answers, no identifiers. Same logging rule.

## Related, not sent to Anthropic

The rate limiter (`lib/server/rateLimit.ts`) stores a key in our Supabase
database: the signed-in user's id, or a salted hash of the IP address for
anonymous visitors. It never goes to the model provider.
