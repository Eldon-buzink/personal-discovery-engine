'use client'

// Report lab: two ways to replace the trait card's tags, on the real card
// text from the example. Both drop the three tags and the "How it tends to
// show up" label.
//
// (A) The body as two labelled parts: how it shows up, then the trade-off.
//     Here the split is made from the existing body (at the first sentence
//     that turns to the cost), which is only a stand-in: done properly it
//     needs the card to be generated as two fields.
// (B) The body as it is, plus one line "In your answers" built from the
//     evidence the card was already written from (evidenceFor: the most
//     strongly held answer, never an excluded facet or item).

import EvidenceDialog from '@/components/known/EvidenceDialog'
import { patternSubtitle } from '@/components/known/TraitCarousel'
import { evidencePanelData } from '@/lib/known/evidencePanel'
import { exampleResponses } from '@/lib/known/exampleReport'
import { evidenceFor, facetAnswers } from '@/lib/known/ring1Evidence'
import { splitSentences } from '@/lib/known/copyChecks'
import { type } from '@/lib/design/type'
import { AI_LINE } from '@/lib/lab/contentLab'
import { bandOf, cardFor, familyLabel, filterTraits } from '@/lib/lab/filterLab'

const ink = '#262420'
const soft = '#56534D'

const TURN = /^(It can also|It can make|It can mean|It can leave|That same|The flip side|The other side|But |This can also|That can also|At times|Sometimes)/

/** Stand-in split of an existing body: everything from the first sentence that turns to the cost. */
export function splitBody(body: string): { showsUp: string; tradeoff: string | null } {
  const s = splitSentences(body)
  const i = s.findIndex((x, k) => k > 0 && TURN.test(x.trim()))
  if (i < 0) return { showsUp: body, tradeoff: null }
  return { showsUp: s.slice(0, i).join(' '), tradeoff: s.slice(i).join(' ') }
}

export default function CardOptions({ facet, option }: { facet: string; option: 'A' | 'B' }) {
  const all = filterTraits()
  const t = all.find((x) => x.facet === facet)!
  const content = cardFor(facet)
  const responses = exampleResponses()
  const body = content.body ?? ''
  const { showsUp, tradeoff } = splitBody(body)
  const answer = evidenceFor(facet, facetAnswers(facet, responses))[0]

  return (
    <main style={{ minHeight: '100vh', background: '#F7F4ED', padding: '28px 16px 64px', textAlign: 'center' }}>
      <p style={{ ...type.meta, margin: '0 0 24px' }}>Report lab · Card option {option}, {t.word}</p>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <h2 style={{ ...type.traitWord, color: ink, margin: '0 0 2px' }}>{t.word}</h2>
        <p style={{ ...type.meta, margin: '0 0 2px' }}>{patternSubtitle(t.revealIndex)}</p>
        <p style={{ ...type.meta, margin: '0 0 22px', textDecoration: 'underline', textUnderlineOffset: 3 }}>This trait is part of {familyLabel(t.cluster)}</p>
        <p style={{ ...type.display4, color: soft, maxWidth: 420, margin: '0 auto 24px' }}>{content.trait_quote}</p>

        {option === 'A' ? (
          <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <p style={{ ...type.ui, color: ink, margin: '0 0 6px' }}>How it shows up</p>
            <p style={{ ...type.body, color: soft, margin: 0 }}>{showsUp}</p>
            {tradeoff && (
              <>
                <p style={{ ...type.ui, color: ink, margin: '20px 0 6px' }}>[LAB COPY] The other side</p>
                <p style={{ ...type.body, color: soft, margin: 0 }}>{tradeoff}</p>
              </>
            )}
          </div>
        ) : (
          <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <p style={{ ...type.body, color: soft, margin: 0 }}>{body}</p>
            {answer && (
              <p style={{ ...type.body, color: soft, margin: '18px 0 0' }}>
                <span style={{ ...type.ui, color: ink }}>[LAB COPY] In your answers:</span>{' '}
                [LAB COPY] you {answer.direction === 'agree' ? 'agreed with' : 'disagreed with'} &ldquo;{answer.text}&rdquo;
              </p>
            )}
          </div>
        )}

        <EvidenceDialog data={evidencePanelData(facet, bandOf(facet), responses, true)} />
        <p style={{ ...type.meta, margin: '8px 0 0' }}>{AI_LINE}</p>
      </div>
    </main>
  )
}
