'use client'

// Design comparison only — four candidate layouts for "Who you are" with 30
// traits, on sample scores. Not linked from anywhere; not for merging.

import { CSSProperties, useMemo, useState } from 'react'
import {
  FacetEntry,
  InteractiveCluster,
  buildPointMotionProfile,
  generateAnimatedBlobPath,
  hashSeed,
  userCuratedHue,
} from '@/components/known/ReportVisuals'
import { DOMAIN_FACETS } from '@/lib/known/ring1-questions'
import { FACET_DESCRIPTIONS, getTraitWord } from '@/lib/known/scoring'

const cream = '#F7F4ED'
const gray = '#8C8A83'
const charcoalSoft = '#56534D'
const charcoal = '#262420'
const line = '#E5E1D5'
const coral = '#D85A30'
const sans = 'var(--font-inter), system-ui, sans-serif'
const serif = 'var(--font-newsreader), serif'

// Working labels for the five domains. New copy — placeholders for this mock.
const DOMAIN_LABEL: Record<string, string> = {
  Neuroticism: 'Emotional range',
  Extraversion: 'Social energy',
  Openness: 'Openness',
  Agreeableness: 'How you relate',
  Conscientiousness: 'How you work',
}

// Sample scores (1–5), deterministic per facet.
function sampleScore(facet: string): number {
  return 1.4 + (hashSeed(facet + '-sample') % 330) / 100
}

interface Trait extends FacetEntry { domain: string; score: number; hue: number }

const TRAITS: Trait[] = (() => {
  const all = Object.entries(DOMAIN_FACETS).flatMap(([domain, facets]) => facets.map((facet) => ({ domain, facet })))
  // reveal order: shuffled, so hues/hueOffset look like a real session
  const revealed = [...all].sort((a, b) => hashSeed(a.facet + 'r') - hashSeed(b.facet + 'r'))
  return all.map(({ domain, facet }) => {
    const score = sampleScore(facet)
    const traitWord = getTraitWord(facet, score)
    const hueOffset = revealed.findIndex((r) => r.facet === facet)
    return { facet, traitWord, hueOffset, content: null, domain, score, hue: userCuratedHue(`ring1-pattern-${traitWord.toLowerCase()}`, hueOffset) }
  })
})()

const pronounced = (t: Trait) => Math.abs(t.score - 3)
const TOP5 = [...TRAITS].sort((a, b) => pronounced(b) - pronounced(a)).slice(0, 5)
const BY_DOMAIN = Object.keys(DOMAIN_FACETS).map((d) => ({ domain: d, traits: TRAITS.filter((t) => t.domain === d) }))

// ── Shared bits ───────────────────────────────────────────────────────────────

function Detail({ t }: { t: Trait | null }) {
  if (!t) return null
  return (
    <div style={{ textAlign: 'center', marginTop: 22 }}>
      <p style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, color: charcoal, margin: '0 0 6px' }}>{t.traitWord}</p>
      <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
        {FACET_DESCRIPTIONS[t.facet]}
      </p>
      <p style={{ fontFamily: sans, fontSize: 11.5, color: gray, marginTop: 8 }}>(the full trait detail would follow here)</p>
    </div>
  )
}

function DomainLabel({ domain }: { domain: string }) {
  return (
    <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, margin: '0 0 6px' }}>
      {DOMAIN_LABEL[domain]}
    </p>
  )
}

function StaticBlob({ t, size, strong }: { t: Trait; size: number; strong?: boolean }) {
  const id = `sb-${t.facet.replace(/\W/g, '')}-${size}-${strong ? 1 : 0}`
  const d = useMemo(() => generateAnimatedBlobPath(30, 30, 19, buildPointMotionProfile(hashSeed(t.traitWord + '-shape'), 9), 0.18, 0), [t.traitWord])
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <defs>
        <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
        <radialGradient id={`${id}-g`} cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor={`hsl(${t.hue},75%,63%)`} stopOpacity={strong ? 0.95 : 0.75} />
          <stop offset="100%" stopColor={`hsl(${t.hue},55%,84%)`} stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <path d={d} fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
    </svg>
  )
}

function OptionFrame({ letter, title, pitch, wide, children }: { letter: string; title: string; pitch: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section style={{ borderTop: `1px solid ${line}`, padding: '48px 0 56px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto 28px', padding: '0 22px' }}>
        <p style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: coral, letterSpacing: '0.06em', margin: '0 0 6px' }}>OPTION {letter}</p>
        <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, color: charcoal, margin: '0 0 8px' }}>{title}</h2>
        <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, lineHeight: 1.6, margin: 0 }}>{pitch}</p>
      </div>
      <div style={{ maxWidth: wide ? 1100 : 560, margin: '0 auto', padding: '0 22px' }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, textAlign: 'center', margin: '0 0 6px' }}>
          Who you are
        </p>
        {children}
      </div>
    </section>
  )
}

const wordBtn: CSSProperties = { background: 'none', border: 0, padding: '2px 0', cursor: 'pointer', fontFamily: serif, fontStyle: 'italic', fontSize: 16 }

// ── A. Top five cluster + all traits as words ────────────────────────────────

function OptionA() {
  const [clusterIdx, setClusterIdx] = useState(0)
  const [selected, setSelected] = useState<Trait>(TOP5[0])
  function pick(t: Trait) {
    setSelected(t)
    const i = TOP5.indexOf(t)
    if (i >= 0) setClusterIdx(i)
  }
  return (
    <>
      <InteractiveCluster facets={TOP5} activeIdx={clusterIdx} onSelect={(i) => pick(TOP5[i])} />
      <Detail t={selected} />
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${line}` }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: gray, fontWeight: 600, textAlign: 'center', margin: '0 0 18px' }}>
          All 30 traits
        </p>
        {BY_DOMAIN.map(({ domain, traits }) => (
          <div key={domain} style={{ marginBottom: 14, textAlign: 'center' }}>
            <DomainLabel domain={domain} />
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px 6px', alignItems: 'baseline' }}>
              {traits.map((t, i) => (
                <span key={t.facet} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                  <button
                    onClick={() => pick(t)}
                    style={{
                      ...wordBtn,
                      color: TOP5.includes(t) ? charcoal : charcoalSoft,
                      fontWeight: TOP5.includes(t) ? 600 : 400,
                      textDecoration: selected === t ? `underline ${coral} 2px` : 'none',
                      textUnderlineOffset: 4,
                    }}
                  >
                    {t.traitWord}
                  </button>
                  {i < traits.length - 1 && <span style={{ color: line }}>·</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── B. One small cluster per domain ──────────────────────────────────────────

function OptionB() {
  const [active, setActive] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<Trait | null>(null)
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '8px 24px' }}>
        {BY_DOMAIN.map(({ domain, traits }) => {
          const ranked = [...traits].sort((a, b) => pronounced(b) - pronounced(a))
          return (
            <div key={domain} style={{ textAlign: 'center' }}>
              <DomainLabel domain={domain} />
              <InteractiveCluster
                facets={ranked}
                activeIdx={active[domain] ?? 0}
                onSelect={(i) => { setActive((a) => ({ ...a, [domain]: i })); setSelected(ranked[i]) }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ maxWidth: 516, margin: '0 auto' }}><Detail t={selected ?? TOP5[0]} /></div>
    </>
  )
}

// ── C. Blob pills that wrap like text ────────────────────────────────────────

const pillCSS = `
  .opt-pill{position:relative;isolation:isolate;border:0;background:none;cursor:pointer;
    padding:9px 16px;font-family:${serif};font-style:italic;font-size:15.5px;color:${charcoal};}
  .opt-pill::before{content:'';position:absolute;inset:1px -2px;z-index:-1;filter:blur(5px);
    background:radial-gradient(ellipse at 45% 40%, hsla(var(--h),75%,64%,.55), hsla(var(--h),60%,78%,.28) 60%, hsla(var(--h),55%,85%,0) 78%);
    border-radius:var(--r);transition:opacity .2s ease, transform .2s ease;opacity:.85;}
  .opt-pill:hover::before{transform:scale(1.06);opacity:1;}
  .opt-pill[aria-pressed="true"]{font-weight:600;}
  .opt-pill[aria-pressed="true"]::before{opacity:1;background:radial-gradient(ellipse at 45% 40%, hsla(var(--h),80%,62%,.85), hsla(var(--h),70%,70%,.4) 60%, hsla(var(--h),55%,85%,0) 80%);}
`

function OptionC() {
  const [selected, setSelected] = useState<Trait>(TOP5[0])
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pillCSS }} />
      {BY_DOMAIN.map(({ domain, traits }) => (
        <div key={domain} style={{ marginBottom: 16, textAlign: 'center' }}>
          <DomainLabel domain={domain} />
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
            {traits.map((t) => {
              const h = hashSeed(t.traitWord)
              const r = `${48 + (h % 14)}% ${52 - (h % 9)}% ${50 + (h % 11)}% ${46 + (h % 8)}% / ${55 + (h % 10)}% ${45 + (h % 12)}% ${58 - (h % 9)}% ${44 + (h % 10)}%`
              return (
                <button
                  key={t.facet}
                  className="opt-pill"
                  aria-pressed={selected === t}
                  onClick={() => setSelected(t)}
                  style={{ ['--h' as string]: String(t.hue), ['--r' as string]: r }}
                >
                  {t.traitWord}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <Detail t={selected} />
    </>
  )
}

// ── D. Spectrum lines ────────────────────────────────────────────────────────

function OptionD() {
  const [selected, setSelected] = useState<Trait>(TOP5[0])
  return (
    <>
      {BY_DOMAIN.map(({ domain, traits }) => {
        const sorted = [...traits].sort((a, b) => a.score - b.score)
        // Four label lanes (above/below the line, near/far); each label takes
        // the first lane with room, so close scores don't stack their words.
        const lanes: number[] = [-Infinity, -Infinity, -Infinity, -Infinity]
        const laneOf = sorted.map((t) => {
          let lane = lanes.findIndex((last) => t.score - last >= 0.8)
          if (lane < 0) lane = lanes.indexOf(Math.min(...lanes))
          lanes[lane] = t.score
          return lane
        })
        return (
          <div key={domain} style={{ marginBottom: 6 }}>
            <DomainLabel domain={domain} />
            <div style={{ position: 'relative', height: 140, margin: '0 18px' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 70, height: 1, background: line }} />
              <span style={{ position: 'absolute', left: -18, top: 64, fontFamily: sans, fontSize: 10, color: gray }}>low</span>
              <span style={{ position: 'absolute', right: -22, top: 64, fontFamily: sans, fontSize: 10, color: gray }}>high</span>
              {sorted.map((t, i) => {
                const left = `${((t.score - 1) / 4) * 100}%`
                const above = laneOf[i] % 2 === 0
                const far = laneOf[i] >= 2
                const isSel = selected === t
                return (
                  <button
                    key={t.facet}
                    onClick={() => setSelected(t)}
                    aria-label={t.traitWord}
                    style={{ position: 'absolute', left, top: 70, transform: 'translate(-50%,-50%)', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                  >
                    <StaticBlob t={t} size={isSel ? 40 : 30} strong={isSel} />
                    <span style={{
                      position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                      [above ? 'bottom' : 'top']: far ? 'calc(100% + 20px)' : '100%', whiteSpace: 'nowrap',
                      fontFamily: serif, fontStyle: 'italic', fontSize: 13, fontWeight: isSel ? 600 : 400,
                      color: isSel ? charcoal : charcoalSoft,
                    } as CSSProperties}>
                      {t.traitWord}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <Detail t={selected} />
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportOptionsPage() {
  return (
    <main style={{ background: cream, minHeight: '100vh', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 22px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: gray, fontWeight: 600, marginBottom: 12 }}>
          Design options · sample data
        </p>
        <h1 style={{ fontFamily: serif, fontSize: 30, fontWeight: 500, color: charcoal, margin: '0 0 12px' }}>
          &ldquo;Who you are&rdquo; with 30 traits
        </h1>
        <p style={{ fontFamily: sans, fontSize: 13.5, color: charcoalSoft, lineHeight: 1.6, margin: 0 }}>
          Four ways to show all 30 traits. Trait words come from the real scoring code on sample scores; colours use the
          real per-trait hues. Domain names are working labels. Everything is clickable.
        </p>
      </div>

      <OptionFrame letter="A" title="Your top five, then all thirty as words"
        pitch="The existing cluster, kept to the five most pronounced traits (furthest from average). Below it, every trait as a tappable word, grouped by domain. Bold words are the five in the cluster.">
        <OptionA />
      </OptionFrame>

      <OptionFrame letter="B" title="One small cluster per domain" wide
        pitch="Five clusters in the current style, six traits each, the most pronounced in the centre. Very on-brand; it's long on a phone and runs 30 animated blobs at once.">
        <OptionB />
      </OptionFrame>

      <OptionFrame letter="C" title="Blob pills that wrap like text"
        pitch="Each trait is a soft tinted blob with its word inside, grouped by domain. Compact and readable at every width; less of a showpiece.">
        <OptionC />
      </OptionFrame>

      <OptionFrame letter="D" title="Spectrum lines"
        pitch="One line per domain, each trait placed from low to high by its score. Shows where you lean, which is new information on the page, so the copy around it needs care.">
        <OptionD />
      </OptionFrame>
    </main>
  )
}
