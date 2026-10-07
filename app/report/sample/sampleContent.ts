// Fixed illustrative content for the sample report (/report/sample).
// Kept as plain data, separate from SampleReportClient, so the landing
// preview (app/(site)/preview-landing) can quote the same excerpts
// without pulling the report components into its bundle.

import type { FacetEntry } from '@/components/known/ReportVisuals'
import type { PatternContent } from '@/lib/known/types'

export const SAMPLE_FACETS: FacetEntry[] = [
  {
    facet: 'assertiveness',
    traitWord: 'Deliberate',
    hueOffset: 0,
    content: {
      trait_quote: "You don't speak until you've thought it through — and when you do, people tend to listen.",
      where_it_shows_up: 'In meetings, you let the room talk itself out before you weigh in — and when you do, it usually reframes the whole conversation. Friends bring you the decision they\'ve been avoiding, not the one they\'ve already made.',
      tags: ['Considered', 'Low reactivity', 'High signal-to-noise'],
      go_deeper: 'This isn\'t hesitation — it\'s a preference for being right over being first. The risk is that people read the pause as disengagement when it\'s actually the opposite.',
      worth_trying: 'Name the pause out loud once in a while: "give me a second on this" costs nothing and stops people from filling the silence with the wrong assumption.',
    } satisfies PatternContent,
  },
  {
    facet: 'independence',
    traitWord: 'Autonomous',
    hueOffset: 1,
    content: {
      trait_quote: 'Left alone with a hard problem, you don\'t stall — you speed up.',
      where_it_shows_up: 'You\'ll take the ambiguous project nobody wants to own. Check-ins feel like overhead unless you asked for them yourself.',
      tags: ['Self-directed', 'Comfortable with ambiguity', 'Low oversight need'],
      go_deeper: 'Autonomy is fuel for you, not just a preference — the work that drains you fastest is the work with someone looking over your shoulder, regardless of how good they are at their job.',
      worth_trying: 'On team projects, ask for a clearly-owned lane up front. You\'ll do your best work there and resent the shared one.',
    } satisfies PatternContent,
  },
  {
    facet: 'reflection',
    traitWord: 'Reflective',
    hueOffset: 2,
    content: {
      trait_quote: 'You process out loud, mostly with yourself.',
      where_it_shows_up: 'The nights you replay a conversation aren\'t anxiety — they\'re how you actually finish thinking about it. You notice patterns in your own behavior weeks before anyone points them out.',
      tags: ['Self-aware', 'Internally processed', 'Slow to conclude, hard to shake'],
      go_deeper: 'The depth is real, but it has a ceiling: reflection without a second opinion can loop instead of resolve. The stuck patterns you\'ve had longest are usually the ones you\'ve only ever examined alone.',
      worth_trying: 'Once a stuck thought hits its third replay, say it to one other person before continuing to think about it alone. External friction moves it faster than more solitary reflection will.',
    } satisfies PatternContent,
  },
]

export const SAMPLE_ENVIRONMENT_CONTENT: PatternContent = {
  trait_quote: 'Quiet, unscheduled stretches are when your actual best work happens.',
  where_it_shows_up: 'A full calendar with no gaps between meetings leaves you foggy by 3pm, even on a light day. Given a free morning, you\'ll default to the hardest task on the list, not the easiest.',
  tags: ['Deep work', 'Low interruption', 'Self-paced'],
  go_deeper: 'This isn\'t about introversion — it\'s about context-switching cost. Every interruption resets a ramp-up you weren\'t consciously tracking.',
  worth_trying: 'Block one interruption-free stretch daily and treat it like an unmovable meeting, not a nice-to-have.',
}
