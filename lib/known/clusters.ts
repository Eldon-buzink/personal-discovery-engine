// The five trait clusters as the redesigned report shows them: label, URL
// slug, the order they're listed in, and the fixed copy under a cluster's
// title. Cluster names are user-facing labels, never theory names: the
// Openness-facet cluster is "Ideas and experiences" here (DOMAIN_LABELS in
// traitOrder.ts still says "Openness" and is used by the live report).
// Copy marked [LAB COPY] is a working draft that still needs sign-off.

import { DOMAIN_FACETS } from './ring1-questions'
import { DOMAIN_LABELS } from './traitOrder'

export const CLUSTERS = Object.keys(DOMAIN_FACETS)

export const clusterLabel = (c: string): string => (c === 'Openness' ? 'Ideas and experiences' : DOMAIN_LABELS[c] ?? c)

export const CLUSTER_SLUGS: Record<string, string> = {
  Neuroticism: 'emotional-range',
  Extraversion: 'social-energy',
  Openness: 'ideas-and-experiences',
  Agreeableness: 'getting-along',
  Conscientiousness: 'drive-and-discipline',
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** The lead sentence under a cluster's title (one phrase per facet). */
export const CLUSTER_LEAD: Record<string, string> = {
  Neuroticism: 'How often you worry, get annoyed or feel low, how on show you feel around others, how hard urges are to resist, and how stress lands on you.',
  Extraversion: 'Warmth, liking company, taking the lead, your pace, looking for thrills and good cheer: how each one shows up for you.',
  Openness: 'Imagination, a feel for art and beauty, noticing and naming your own feelings, a taste for new experiences, enjoying ideas, and being ready to question tradition.',
  Agreeableness: 'Trust, honesty, helping out, handling conflict, modesty and feeling for others: how each one shows up when you deal with people.',
  Conscientiousness: 'Feeling able to get things done, keeping things in order, keeping your word, ambition, follow-through and care before acting.',
}

/** What the group is about, in plain words, from its six facets. */
export const CLUSTER_ABOUT: Record<string, string> = {
  Neuroticism: '[LAB COPY] This group is about the harder feelings, like worry, anger and low mood, and how you deal with stress and urges.',
  Extraversion: '[LAB COPY] This group is about your energy around other people: how quickly you warm up, how much company you want, and how full and lively you like your days.',
  Openness: '[LAB COPY] This group is about what draws you in: ideas, art and beauty, your own feelings, new experiences, and how you see old rules and traditions.',
  Agreeableness: '[LAB COPY] This group is about how you deal with people: how much you trust them, how plainly you speak, how you handle conflict, and how much their troubles move you.',
  Conscientiousness: '[LAB COPY] This group is about how you get things done: how sure you feel, how you keep things in order, how you keep your word, and how you push toward goals.',
}

export const CLUSTER_HOW_TO_READ = '[LAB COPY] Each trait runs between two ends, and neither end is better. Tap a trait to see where your answers put you.'

/** The line under a trait card's evidence pill and on generated text. */
export const AI_LINE = 'Written by AI, based on your answers.'
