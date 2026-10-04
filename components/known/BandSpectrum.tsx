/**
 * components/known/BandSpectrum.tsx
 *
 * Static three-point read of where a mini-assessment band sits, left-to-
 * right — same dot-and-line visual grammar as QuestionCard's DotScale, just
 * non-interactive and fixed at 3 points instead of 5. Labels are the
 * product's own band vocabulary (checkInOptionWord), not invented here.
 *
 * Extracted from the mini-assessment result page so facet-detail can show
 * the same spectrum for a facet's original directional read, not just the
 * one-time result screen.
 *
 * Labels are absolutely positioned at each dot's own 0%/50%/100% anchor
 * (left-aligned, centered, right-aligned respectively) rather than laid out
 * with flex justify-between — justify-between only adds visible space
 * between items out of LEFTOVER container width, and with words like
 * "Traditional"/"Progressive" that leftover shrank to ~0px in practice,
 * rendering the three labels jammed together with no visible gap at all.
 * Anchoring each label independently to its own dot's position can't
 * collide this way regardless of word length.
 *
 * Caller note: this div has no width of its own (w-full), so a caller
 * placing it inside a flex-col + items-center parent (not items-stretch)
 * must give its immediate wrapper an explicit width:'100%' — otherwise the
 * wrapper shrink-wraps to content size and every percentage-based position
 * below collapses toward the same point. See the result page's own wrapper
 * for the working pattern.
 */

import { checkInOptionWord } from '@/lib/known/checkInOptions'
import type { MiniAssessmentBand, MiniAssessmentFacet } from '@/lib/known/miniAssessmentScoring'

const BAND_ORDER: MiniAssessmentBand[] = ['low', 'mid', 'high']
const BAND_POSITION: Record<MiniAssessmentBand, number> = { low: 0, mid: 50, high: 100 }
const BAND_ANCHOR: Record<MiniAssessmentBand, 'left' | 'center' | 'right'> = { low: 'left', mid: 'center', high: 'right' }

function anchorTransform(anchor: 'left' | 'center' | 'right'): string {
  if (anchor === 'left') return 'translateX(0)'
  if (anchor === 'right') return 'translateX(-100%)'
  return 'translateX(-50%)'
}

export default function BandSpectrum({ facet, band }: { facet: MiniAssessmentFacet; band: MiniAssessmentBand }) {
  return (
    <div className="w-full" style={{ maxWidth: 320 }}>
      <div className="relative w-full" style={{ height: 22, marginBottom: 12 }}>
        <div className="absolute bg-line" style={{ left: 11, right: 11, top: '50%', height: 1, transform: 'translateY(-50%)' }} />
        {BAND_ORDER.map((b) => {
          const active = b === band
          return (
            <div
              key={b}
              className="absolute rounded-full"
              style={{
                left: `${BAND_POSITION[b]}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: active ? 22 : 14,
                height: active ? 22 : 14,
                background: active ? '#262420' : '#F7F4ED',
                border: `2px solid ${active ? '#262420' : '#8C8A83'}`,
              }}
            />
          )
        })}
      </div>
      <div className="relative w-full" style={{ height: 16 }}>
        {BAND_ORDER.map((b) => (
          <span
            key={b}
            className="absolute font-sans whitespace-nowrap"
            style={{
              left: `${BAND_POSITION[b]}%`,
              transform: anchorTransform(BAND_ANCHOR[b]),
              fontSize: 11,
              color: b === band ? '#262420' : '#8C8A83',
              fontWeight: b === band ? 600 : 400,
            }}
          >
            {checkInOptionWord(facet, b)}
          </span>
        ))}
      </div>
    </div>
  )
}
