'use client'

// Report lab: evidence panel, option A (picked). A blob on a quiet track per
// trait with the two end words; the position sentence is built only from
// the trait's own end words. Shared by the options board and the content
// lab's dialogs.

import { useMemo } from 'react'
import { buildPointMotionProfile, generateAnimatedBlobPath, hashSeed } from '@/lib/blobs'
import { answersHeading, evidencePanelData, itemCountLine } from '@/lib/known/evidencePanel'
import { facetTraitWords } from '@/lib/known/scoring'
import { type } from '@/lib/design/type'
import { bandOf, type FilterTrait } from '@/lib/lab/filterLab'
import { colourKey, hslCss, toHsl, type Colour } from '@/lib/lab/colours'

const ink = '#262420'
const soft = '#56534D'
export const hair = '#E5E1D5'
const sep = { borderTop: `1px solid ${hair}` }

export function Blob({ t, hue, size = 26 }: { t: FilterTrait; hue: Colour; size?: number }) {
  const d = useMemo(() => generateAnimatedBlobPath(20, 20, 13, buildPointMotionProfile(hashSeed(`${t.word}-shape`), 9), 0.3, 0), [t.word])
  const id = `eb-${t.facet.replace(/\W/g, '')}-${colourKey(hue)}`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <radialGradient id={`${id}-g`} cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor={hslCss(toHsl(hue))} stopOpacity="1" />
          <stop offset="100%" stopColor={hslCss(toHsl(hue), -10, 8)} stopOpacity="0.55" />
        </radialGradient>
        <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4" /></filter>
      </defs>
      <path d={d} fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
    </svg>
  )
}

const POS = { low: 0, mid: 50, high: 100 } as const

/** Built only from the trait's end words. */
export function positionSentence(t: FilterTrait): string {
  const w = facetTraitWords(t.facet)!
  const band = bandOf(t.facet)
  const where = band === 'mid' ? 'in the middle' : `near the ${w[band]} end`
  return `[LAB COPY] This line runs from ${w.low} to ${w.high}. Your answers put you ${where}.`
}

/** A quiet hairline with the blob at the user's end (or the middle) and the two end words under it. */
export function Track({ t, hue }: { t: FilterTrait; hue: Colour }) {
  const w = facetTraitWords(t.facet)!
  const band = bandOf(t.facet)
  return (
    <div role="img" aria-label={positionSentence(t).replace('[LAB COPY] ', '')} style={{ position: 'relative', width: '100%', maxWidth: 360, margin: '6px auto 0' }}>
      <div style={{ position: 'relative', height: 28 }}>
        <div style={{ position: 'absolute', left: 13, right: 13, top: '50%', height: 1, background: hair }} />
        <div style={{ position: 'absolute', top: 1, left: `calc(${POS[band]}% - ${(POS[band] / 100) * 26}px)` }}><Blob t={t} hue={hue} /></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ ...type.meta, color: band === 'low' ? ink : '#8C8A83' }}>{w.low}</span>
        <span style={{ ...type.meta, color: band === 'high' ? ink : '#8C8A83', textAlign: 'right' }}>{w.high}</span>
      </div>
    </div>
  )
}

const rowBtn: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minHeight: 44, padding: '14px 4px', border: 0, background: 'none', cursor: 'pointer', textAlign: 'center' }

/** Multi-trait panel body: two plain sentences, then one track row per trait (tap opens it). No answers. */
export function MultiRows({ traits, hueOf, onPick }: { traits: FilterTrait[]; hueOf: (t: FilterTrait) => Colour; onPick?: (facet: string) => void }) {
  return (
    <>
      <p style={{ ...type.body, color: soft, margin: 0 }}>[LAB COPY] This is based on {traits.length} of your traits, from your answers.</p>
      <p style={{ ...type.body, color: soft, margin: '4px 0 18px' }}>[LAB COPY] Each trait runs between two ends. Your answers put you near one end or in the middle.</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {traits.map((t) => (
          <li key={t.facet} style={sep}>
            <button type="button" className="evr-row" style={rowBtn} onClick={() => onPick?.(t.facet)} aria-label={`${t.word}. ${positionSentence(t).replace('[LAB COPY] ', '')} Open this trait.`}>
              <span style={{ ...type.traitWord, fontSize: 18, color: ink }}>{t.word}</span>
              <Track t={t} hue={hueOf(t)} />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Per-trait panel body: the statements sentence, the track and position sentence, the two answers, the statements line. */
export function SingleBody({ t, hue, responses }: { t: FilterTrait; hue: Colour; responses: Map<number, number> }) {
  const data = evidencePanelData(t.facet, bandOf(t.facet), responses, true)
  const answers = data?.sensitive ? [] : data?.answers ?? []
  return (
    <>
      <p style={{ ...type.body, color: soft, margin: '0 0 18px' }}>[LAB COPY] This is based on {data?.itemCount ?? 4} statements you answered.</p>
      <div style={{ ...sep, paddingTop: 16 }}>
        <span style={{ ...type.traitWord, fontSize: 20, color: ink }}>{t.word}</span>
        <Track t={t} hue={hue} />
        <p style={{ ...type.body, color: soft, margin: '12px 0 0' }}>{positionSentence(t)}</p>
      </div>
      {answers.length > 0 && (
        <div style={{ ...sep, paddingTop: 16, marginTop: 18 }}>
          <p style={{ ...type.ui, color: ink, margin: '0 0 6px' }}>{answersHeading(answers.length)}</p>
          {answers.map((a, i) => (
            <div key={a.text} style={{ ...(i ? sep : {}), padding: '10px 0' }}>
              <p style={{ ...type.body, color: ink, margin: 0 }}>&ldquo;{a.text}&rdquo;</p>
              <p style={{ ...type.meta, margin: '2px 0 0' }}>{a.answer}</p>
            </div>
          ))}
        </div>
      )}
      <p style={{ ...type.meta, margin: '14px 0 0' }}>{itemCountLine(data?.itemCount ?? 4)}</p>
    </>
  )
}
