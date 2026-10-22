'use client'

// Report lab: two designs for "What this is based on", shown open (inline,
// not as a modal) so they can be compared. Both start with two plain
// sentences (what it is based on, how to read it); the position sentence is
// built only from the trait's own end words. Blob markers in the cluster
// hue (paid) or the trait's own hue (free); hairline separators, no boxes.
// Multi-trait panels never show answers; the per-trait panel keeps its two
// answers and the statement-count line.
//
// (A) A blob on a quiet track per trait, with the two end words.
// (B) Two groups: "Leans toward" (blob, trait word, the other end) and
//     "Near the middle" (one quiet line of names). No tracks.

import { useMemo } from 'react'
import { buildPointMotionProfile, generateAnimatedBlobPath, hashSeed } from '@/lib/blobs'
import { answersHeading, evidencePanelData, itemCountLine } from '@/lib/known/evidencePanel'
import { exampleResponses } from '@/lib/known/exampleReport'
import { facetTraitWords } from '@/lib/known/scoring'
import { type } from '@/lib/design/type'
import { bandOf, clusterTraits, filterTraits, type FilterTrait } from '@/lib/lab/filterLab'

const ink = '#262420'
const soft = '#56534D'
const hair = '#E5E1D5'

function Blob({ t, hue, size = 26 }: { t: FilterTrait; hue: number; size?: number }) {
  const d = useMemo(() => generateAnimatedBlobPath(20, 20, 13, buildPointMotionProfile(hashSeed(`${t.word}-shape`), 9), 0.3, 0), [t.word])
  const id = `eb-${t.facet.replace(/\W/g, '')}-${hue}`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <radialGradient id={`${id}-g`} cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor={`hsl(${hue},80%,62%)`} stopOpacity="1" />
          <stop offset="100%" stopColor={`hsl(${hue},70%,70%)`} stopOpacity="0.55" />
        </radialGradient>
        <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4" /></filter>
      </defs>
      <path d={d} fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
    </svg>
  )
}

const POS = { low: 0, mid: 50, high: 100 } as const

/** A quiet hairline with the blob at the user's end (or the middle) and the two end words under it. */
function Track({ t, hue }: { t: FilterTrait; hue: number }) {
  const w = facetTraitWords(t.facet)!
  const band = bandOf(t.facet)
  return (
    <div role="img" aria-label={`${positionSentence(t)}`} style={{ position: 'relative', width: '100%', maxWidth: 360, margin: '6px auto 0' }}>
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

/** Built only from the trait's end words. */
export function positionSentence(t: FilterTrait): string {
  const w = facetTraitWords(t.facet)!
  const band = bandOf(t.facet)
  const where = band === 'mid' ? 'in the middle' : `near the ${w[band]} end`
  return `[LAB COPY] This line runs from ${w.low} to ${w.high}. Your answers put you ${where}.`
}

const otherEnd = (t: FilterTrait) => { const w = facetTraitWords(t.facet)!; return bandOf(t.facet) === 'high' ? w.low : w.high }

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#F7F4ED', borderRadius: 18, padding: '24px 22px 26px', maxWidth: 560, margin: '0 auto', boxShadow: '0 18px 48px rgba(38,36,32,0.10)', textAlign: 'center' }}>
      <h2 style={{ ...type.display3, color: ink, margin: '0 0 10px' }}>{title}</h2>
      {children}
    </div>
  )
}

function Intro({ basedOn }: { basedOn: string }) {
  return (
    <>
      <p style={{ ...type.body, color: soft, margin: 0 }}>{basedOn}</p>
      <p style={{ ...type.body, color: soft, margin: '4px 0 18px' }}>[LAB COPY] Each trait runs between two ends. Your answers put you near one end or in the middle.</p>
    </>
  )
}

const rowBtn: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minHeight: 44, padding: '14px 4px', border: 0, background: 'none', cursor: 'pointer', textAlign: 'center' }
const sep = { borderTop: `1px solid ${hair}` }

function MultiA({ traits, hueOf }: { traits: FilterTrait[]; hueOf: (t: FilterTrait) => number }) {
  return (
    <Panel title="What this is based on">
      <Intro basedOn={`[LAB COPY] This is based on ${traits.length} of your traits, from your answers.`} />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {traits.map((t) => (
          <li key={t.facet} style={sep}>
            <button type="button" style={rowBtn} aria-label={`${t.word}. ${positionSentence(t)} Open this trait.`}>
              <span style={{ ...type.traitWord, fontSize: 18, color: ink }}>{t.word}</span>
              <Track t={t} hue={hueOf(t)} />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function MultiB({ traits, hueOf }: { traits: FilterTrait[]; hueOf: (t: FilterTrait) => number }) {
  const leans = traits.filter((t) => bandOf(t.facet) !== 'mid')
  const middle = traits.filter((t) => bandOf(t.facet) === 'mid')
  return (
    <Panel title="What this is based on">
      <Intro basedOn={`[LAB COPY] This is based on ${traits.length} of your traits, from your answers.`} />
      {leans.length > 0 && (
        <>
          <p style={{ ...type.meta, margin: '0 0 2px' }}>[LAB COPY] Leans toward</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {leans.map((t) => (
              <li key={t.facet} style={sep}>
                <button type="button" style={{ ...rowBtn, flexDirection: 'row', justifyContent: 'center', gap: 10 }} aria-label={`${t.word}. ${positionSentence(t)} Open this trait.`}>
                  <Blob t={t} hue={hueOf(t)} />
                  <span style={{ ...type.traitWord, fontSize: 18, color: ink }}>{t.word}</span>
                  <span style={{ ...type.meta }}>[LAB COPY] the other end is {otherEnd(t)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {middle.length > 0 && (
        <div style={{ ...sep, paddingTop: 14, marginTop: 4 }}>
          <p style={{ ...type.meta, margin: '0 0 4px' }}>[LAB COPY] Near the middle</p>
          <p style={{ ...type.body, color: soft, margin: 0 }}>{middle.map((t) => t.word).join(', ')}</p>
        </div>
      )}
    </Panel>
  )
}

function Single({ t, hue, option, responses }: { t: FilterTrait; hue: number; option: 'A' | 'B'; responses: Map<number, number> }) {
  const data = evidencePanelData(t.facet, bandOf(t.facet), responses, true)
  const answers = data?.answers ?? []
  return (
    <Panel title="What this is based on">
      <p style={{ ...type.body, color: soft, margin: 0 }}>[LAB COPY] This is based on {data?.itemCount ?? 4} statements you answered.</p>
      <p style={{ ...type.body, color: soft, margin: '4px 0 18px' }}>[LAB COPY] The trait runs between two ends. Your answers put you near one end or in the middle.</p>
      <div style={{ ...sep, paddingTop: 16 }}>
        {option === 'A' ? (
          <>
            <span style={{ ...type.traitWord, fontSize: 20, color: ink }}>{t.word}</span>
            <Track t={t} hue={hue} />
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Blob t={t} hue={hue} size={30} />
            <span style={{ ...type.traitWord, fontSize: 20, color: ink }}>{t.word}</span>
          </div>
        )}
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
    </Panel>
  )
}

export default function EvidenceOptions({ option, panel, free }: { option: 'A' | 'B'; panel: string; free: boolean }) {
  const all = filterTraits()
  const responses = exampleResponses()
  const hueOf = (t: FilterTrait) => (free ? t.traitHue : t.clusterHue)
  const byWord = (f: string) => all.find((t) => t.facet === f)!
  let body: React.ReactNode
  if (panel === 'multi') body = option === 'A' ? <MultiA traits={clusterTraits(all, 'Conscientiousness')} hueOf={hueOf} /> : <MultiB traits={clusterTraits(all, 'Conscientiousness')} hueOf={hueOf} />
  else {
    const t = byWord(panel === 'deliberate' ? 'Cautiousness' : panel === 'take-charge' ? 'Assertiveness' : 'Achievement-Striving')
    body = <Single t={t} hue={hueOf(t)} option={option} responses={responses} />
  }
  return (
    <main style={{ minHeight: '100vh', background: '#EFEBE2', padding: '28px 16px 64px' }}>
      <p style={{ ...type.meta, textAlign: 'center', margin: '0 0 18px' }}>Report lab · Evidence panel option {option}, {panel === 'multi' ? 'multi-trait (Drive and discipline)' : `per-trait (${panel})`}{free ? ', free user' : ''}</p>
      {body}
    </main>
  )
}
