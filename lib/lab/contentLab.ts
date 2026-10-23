// Report lab (app/report/lab/content): content per selection. Lab only:
// nothing here is used by the real report and nothing calls a model.
//
// - Static cluster descriptions: two drafts per cluster, each phrase tied to
//   one of the cluster's six facets (DOMAIN_FACETS), for review.
// - Eligibility: a cluster reading needs at least 3 revealed traits in that
//   cluster; the Summary needs at least SUMMARY_MIN_TRAITS revealed traits
//   (below that, the most pronounced headlines stand in).
// - draws_on: what a generated Summary or reading says it is based on,
//   validated against the facets it was given.

import { RELATIONSHIP_EXCLUDED_FACETS } from '@/lib/known/relationshipDefinitions'
import { DOMAIN_FACETS } from '@/lib/known/ring1-questions'
import type { FilterTrait } from './filterLab'

export const AI_LINE = 'Written by AI, based on your answers.'

export const SUMMARY_MIN_TRAITS = 8
export const CLUSTER_READING_MIN_TRAITS = 3

// Facets never sent to the model for a Summary or a reading (the same list
// relationship insights use: Depression). They still show in the visual and
// keep their own card.
export const CONTENT_EXCLUDED_FACETS: readonly string[] = RELATIONSHIP_EXCLUDED_FACETS

export interface DescriptionDraft { text: string; covers: { phrase: string; facet: string }[] }

export const CLUSTER_DESCRIPTIONS: Record<string, [DescriptionDraft, DescriptionDraft]> = {
  Neuroticism: [
    {
      text: 'How worry, frustration and low moods show up for you, how much you watch how you come across, how easily you give in to urges, and how you hold up under pressure.',
      covers: [
        { phrase: 'worry', facet: 'Anxiety' }, { phrase: 'frustration', facet: 'Anger' }, { phrase: 'low moods', facet: 'Depression' },
        { phrase: 'watch how you come across', facet: 'Self-Consciousness' }, { phrase: 'give in to urges', facet: 'Immoderation' },
        { phrase: 'hold up under pressure', facet: 'Vulnerability' },
      ],
    },
    {
      text: 'How often you worry, get annoyed or feel low, how on show you feel around others, how hard urges are to resist, and how stress lands on you.',
      covers: [
        { phrase: 'worry', facet: 'Anxiety' }, { phrase: 'get annoyed', facet: 'Anger' }, { phrase: 'feel low', facet: 'Depression' },
        { phrase: 'how on show you feel', facet: 'Self-Consciousness' }, { phrase: 'urges are to resist', facet: 'Immoderation' },
        { phrase: 'how stress lands on you', facet: 'Vulnerability' },
      ],
    },
  ],
  Extraversion: [
    {
      text: 'How quickly you warm to people, how much you like being in a group, how readily you take the lead, how busy you keep, how much you look for excitement, and how often you feel upbeat.',
      covers: [
        { phrase: 'warm to people', facet: 'Friendliness' }, { phrase: 'being in a group', facet: 'Gregariousness' },
        { phrase: 'take the lead', facet: 'Assertiveness' }, { phrase: 'how busy you keep', facet: 'Activity Level' },
        { phrase: 'look for excitement', facet: 'Excitement-Seeking' }, { phrase: 'feel upbeat', facet: 'Cheerfulness' },
      ],
    },
    {
      text: 'Warmth, liking company, taking the lead, your pace, looking for thrills and good cheer: how each one shows up for you.',
      covers: [
        { phrase: 'warmth', facet: 'Friendliness' }, { phrase: 'liking company', facet: 'Gregariousness' },
        { phrase: 'taking the lead', facet: 'Assertiveness' }, { phrase: 'your pace', facet: 'Activity Level' },
        { phrase: 'looking for thrills', facet: 'Excitement-Seeking' }, { phrase: 'good cheer', facet: 'Cheerfulness' },
      ],
    },
  ],
  Openness: [
    {
      text: 'How much you imagine and daydream, how much art and beauty move you, how aware you are of your own feelings, how much you like trying new things, how much you enjoy ideas, and how you feel about questioning traditions and rules.',
      covers: [
        { phrase: 'imagine and daydream', facet: 'Imagination' }, { phrase: 'art and beauty move you', facet: 'Artistic Interests' },
        { phrase: 'aware you are of your own feelings', facet: 'Emotionality' }, { phrase: 'trying new things', facet: 'Adventurousness' },
        { phrase: 'enjoy ideas', facet: 'Intellect' }, { phrase: 'questioning traditions and rules', facet: 'Liberalism' },
      ],
    },
    {
      text: 'Imagination, a feel for art and beauty, noticing and naming your own feelings, a taste for new experiences, enjoying ideas, and being ready to question tradition.',
      covers: [
        { phrase: 'imagination', facet: 'Imagination' }, { phrase: 'a feel for art and beauty', facet: 'Artistic Interests' },
        { phrase: 'noticing and naming your own feelings', facet: 'Emotionality' }, { phrase: 'a taste for new experiences', facet: 'Adventurousness' },
        { phrase: 'enjoying ideas', facet: 'Intellect' }, { phrase: 'ready to question tradition', facet: 'Liberalism' },
      ],
    },
  ],
  Agreeableness: [
    {
      text: 'How much you trust people, how straight you are with them, how far you go to help, how you handle disagreements, how you talk about yourself, and how much other people\'s troubles move you.',
      covers: [
        { phrase: 'trust people', facet: 'Trust' }, { phrase: 'how straight you are', facet: 'Morality' },
        { phrase: 'how far you go to help', facet: 'Altruism' }, { phrase: 'handle disagreements', facet: 'Cooperation' },
        { phrase: 'how you talk about yourself', facet: 'Modesty' }, { phrase: "other people's troubles move you", facet: 'Sympathy' },
      ],
    },
    {
      text: 'Trust, honesty, helping out, handling conflict, modesty and feeling for others: how each one shows up when you deal with people.',
      covers: [
        { phrase: 'trust', facet: 'Trust' }, { phrase: 'honesty', facet: 'Morality' }, { phrase: 'helping out', facet: 'Altruism' },
        { phrase: 'handling conflict', facet: 'Cooperation' }, { phrase: 'modesty', facet: 'Modesty' }, { phrase: 'feeling for others', facet: 'Sympathy' },
      ],
    },
  ],
  Conscientiousness: [
    {
      text: 'How sure you feel that you can get things done, how much you like order, how bound you feel by promises and rules, how hard you push toward goals, how well you keep going on dull tasks, and how much you think before you act.',
      covers: [
        { phrase: 'sure you feel that you can get things done', facet: 'Self-Efficacy' }, { phrase: 'like order', facet: 'Orderliness' },
        { phrase: 'bound you feel by promises and rules', facet: 'Dutifulness' }, { phrase: 'push toward goals', facet: 'Achievement-Striving' },
        { phrase: 'keep going on dull tasks', facet: 'Self-Discipline' }, { phrase: 'think before you act', facet: 'Cautiousness' },
      ],
    },
    {
      text: 'Feeling able to get things done, keeping things in order, keeping your word, ambition, follow-through and care before acting.',
      covers: [
        { phrase: 'feeling able to get things done', facet: 'Self-Efficacy' }, { phrase: 'keeping things in order', facet: 'Orderliness' },
        { phrase: 'keeping your word', facet: 'Dutifulness' }, { phrase: 'ambition', facet: 'Achievement-Striving' },
        { phrase: 'follow-through', facet: 'Self-Discipline' }, { phrase: 'care before acting', facet: 'Cautiousness' },
      ],
    },
  ],
}

/** Every draft names all six facets of its cluster, each once. */
export function descriptionCoversCluster(cluster: string, draft: DescriptionDraft): boolean {
  const facets = DOMAIN_FACETS[cluster] ?? []
  const covered = new Set(draft.covers.map((c) => c.facet))
  return covered.size === facets.length && facets.every((f) => covered.has(f)) && draft.covers.every((c) => draft.text.toLowerCase().includes(c.phrase.toLowerCase()))
}

// ── Eligibility ────────────────────────────────────────────────────────────

/** Traits a generated piece may draw on: revealed, minus the excluded facets. */
export function sendable(traits: FilterTrait[]): FilterTrait[] {
  return traits.filter((t) => !CONTENT_EXCLUDED_FACETS.includes(t.facet))
}

export function summaryEligible(revealed: FilterTrait[]): boolean {
  return revealed.length >= SUMMARY_MIN_TRAITS
}

export function clusterReadingEligible(revealedInCluster: FilterTrait[]): boolean {
  return revealedInCluster.length >= CLUSTER_READING_MIN_TRAITS
}

// ── draws_on ───────────────────────────────────────────────────────────────

export type DrawsOnCheck = { ok: true; facets: string[] } | { ok: false; reason: string }

/**
 * The model's `draws_on` must be a non-empty list of facets it was given,
 * each once, none excluded. Anything else rejects the output (the caller
 * retries once, then falls back).
 */
export function validateDrawsOn(drawsOn: unknown, inputFacets: readonly string[], max = 8): DrawsOnCheck {
  if (!Array.isArray(drawsOn) || drawsOn.length === 0) return { ok: false, reason: 'draws_on missing or empty' }
  if (drawsOn.length > max) return { ok: false, reason: `draws_on lists more than ${max} traits` }
  const seen = new Set<string>()
  for (const f of drawsOn) {
    if (typeof f !== 'string') return { ok: false, reason: 'draws_on has a non-string entry' }
    if (CONTENT_EXCLUDED_FACETS.includes(f)) return { ok: false, reason: `draws_on names an excluded facet (${f})` }
    if (!inputFacets.includes(f)) return { ok: false, reason: `draws_on names a facet it was not given (${f})` }
    if (seen.has(f)) return { ok: false, reason: `draws_on repeats ${f}` }
    seen.add(f)
  }
  return { ok: true, facets: Array.from(seen) }
}
