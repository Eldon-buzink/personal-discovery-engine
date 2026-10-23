// Words for the report's closing panel and sticky bar, per CTA state
// (lib/known/reportCta.ts). One headline and one line for the panel, one
// short line for the bar. No pricing claims. Behind NEXT_PUBLIC_REPORT_CTA.

import { branchContext, type Branch } from './branchSuggestion'
import type { Cta } from './reportCta'

/** How each branch is named inside a sentence. */
export const BRANCH_IN_SENTENCE: Record<Branch, string> = {
  environment: 'your surroundings',
  relationships: 'how you connect',
  energy: 'your energy',
  working_style: 'your working style',
  direction: 'your direction',
}

export interface CtaCopyInput {
  /** Ring 1 statements answered (of 120). */
  answered: number
  /** Ring 1 traits revealed. */
  revealed: number
  /** Trait words behind the suggestion, strongest first. */
  suggestionWords: string[]
}

export interface CtaCopy { title: string; line: string; barLine: string }

const words = (w: string[]) => (w.length >= 2 ? `${w[0]} and ${w[1]} stand out` : `${w[0]} stands out`)

export function ctaCopy(cta: Cta, i: CtaCopyInput): CtaCopy {
  switch (cta.state) {
    case 'not-started':
      return {
        title: 'Your own report starts here',
        line: 'Answer a few statements at your own pace. Your traits come into view one by one, and the first five are free.',
        barLine: 'This is an example. Yours starts free, at your own pace.',
      }
    case 'free-in-progress':
      return {
        title: "There's more of you to find",
        line: `You've answered ${i.answered} of 120. Every few answers bring another trait into view, and the full picture shows how they play out in your life.`,
        barLine: `${i.revealed} ${i.revealed === 1 ? 'trait' : 'traits'} so far. The next one is a few answers away.`,
      }
    case 'free-locked':
      return {
        title: 'This is only the beginning',
        line: "Your first five traits are a start. The full picture adds the other 25, and five new parts of your life: your surroundings, how you connect, your energy, how you work and where you're headed.",
        barLine: "Five traits in, and there's so much more of you to see.",
      }
    case 'paid-in-progress': {
      const branch = cta.primary.kind === 'continue' ? cta.primary.branch : null
      return {
        title: 'Your picture is still filling in',
        line: branch
          ? `Your answers are saved. Pick up where you left off in ${BRANCH_IN_SENTENCE[branch]}, or start another part whenever you like.`
          : `You've answered ${i.answered} of 120. Your answers are saved, so pick up where you left off whenever you like.`,
        barLine: 'Your answers are saved. Carry on when you are ready.',
      }
    }
    case 'paid-suggestion': {
      const branch = cta.primary.kind === 'explore' ? cta.primary.branch : 'environment'
      return {
        title: 'Where to look next',
        line: i.suggestionWords.length > 0
          ? `${words(i.suggestionWords)} in your answers. It's worth seeing how that shows up in ${branchContext(branch)}.`
          : `It's worth seeing how your traits show up in ${branchContext(branch)}.`,
        barLine: `Your answers point to ${BRANCH_IN_SENTENCE[branch]} next.`,
      }
    }
    case 'paid-done':
      return {
        title: "You've explored every part",
        line: 'Your report keeps growing with you. Practice is where it turns into small changes, one day at a time.',
        barLine: 'Every part explored. Keep it going in practice.',
      }
  }
}
